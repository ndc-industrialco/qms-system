/**
 * Cached Microsoft Graph App-Only Access Token
 *
 * Azure AD Client Credentials tokens have a ~3600s lifetime.
 * This module caches the token in Redis to avoid a round-trip to Azure
 * on every MS Graph call (email send, user fetch, etc.).
 *
 * Cache key:  graph:app_token
 * TTL:        expires_in - SAFETY_BUFFER_SEC  (derived from actual token response)
 *             Falls back to DEFAULT_TTL_SEC if expires_in is not available.
 */

import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const CACHE_KEY = "graph:app_token";
/** Safety margin subtracted from expires_in so the cached token never expires mid-request. */
const SAFETY_BUFFER_SEC = 300; // 5 minutes
/** Fallback TTL used when expires_in is unavailable or zero. */
const DEFAULT_TTL_SEC = 3300; // 55 minutes — conservative default
const LOCK_KEY = "graph:app_token:lock";
const LOCK_TTL_SEC = 15;
const WAIT_STEP_MS = 150;
const WAIT_MAX_MS = 5000;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface FreshToken {
  token: string;
  /** Effective cache TTL in seconds, computed from the actual expires_in value. */
  cacheTtlSec: number;
}

async function fetchFreshToken(): Promise<FreshToken> {
  const tenantId = process.env.AZURE_AD_TENANT_ID!;
  const clientId = process.env.AZURE_AD_CLIENT_ID!;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to acquire app-only access token: ${res.status} ${errorText}`);
  }

  const data = (await res.json()) as TokenResponse;

  // Derive the effective cache TTL from the actual token lifetime.
  // Math.max(1, ...) clamps to a minimum of 1 second so Redis expires
  // the entry almost immediately instead of falling back to DEFAULT_TTL_SEC.
  // This is intentional: a near-expired token should NOT be cached for 55 minutes.
  const rawTtl = typeof data.expires_in === "number" && data.expires_in > 0
    ? data.expires_in
    : DEFAULT_TTL_SEC + SAFETY_BUFFER_SEC; // treat missing as ~1h
  const cacheTtlSec = Math.max(1, rawTtl - SAFETY_BUFFER_SEC);

  return { token: data.access_token, cacheTtlSec };
}

/**
 * Returns a valid MS Graph app-only access token.
 * Reads from Redis cache first; fetches from Azure AD on miss.
 */
export async function getGraphToken(): Promise<string> {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return cached;

    // Try to become the single refresher across instances.
    const lockAcquired = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL_SEC, "NX");
    if (lockAcquired === "OK") {
      try {
        const { token, cacheTtlSec } = await fetchFreshToken();
        await redis.set(CACHE_KEY, token, "EX", cacheTtlSec);
        return token;
      } finally {
        await redis.del(LOCK_KEY).catch(() => null);
      }
    }

    // Another instance is refreshing. Wait briefly for cache fill.
    const deadline = Date.now() + WAIT_MAX_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
      const waitCached = await redis.get(CACHE_KEY);
      if (waitCached) return waitCached;
    }

    // Wait timed out. Do a final cache check — the lock holder may have just written it.
    const lastCheck = await redis.get(CACHE_KEY);
    if (lastCheck) return lastCheck;

    // Try to take over the refresh ourselves (lock may have expired or holder crashed).
    const takeover = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL_SEC, "NX");
    if (takeover === "OK") {
      try {
        const { token, cacheTtlSec } = await fetchFreshToken();
        await redis.set(CACHE_KEY, token, "EX", cacheTtlSec);
        return token;
      } finally {
        await redis.del(LOCK_KEY).catch(() => null);
      }
    }

    // Lock is still held by another instance — fetch without caching as last resort
    // for this single request only. Prevents all waiting instances from hitting Azure AD.
    logger.warn("[graph-token] Token refresh lock contention after wait — fetching without cache");
    const { token } = await fetchFreshToken();
    return token;

  } catch (err) {
    // Redis unavailable — fall through to fetch fresh token
    logger.warn("[graph-token] Redis unavailable, fetching fresh token", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Redis completely unavailable path: fetch and attempt to cache, but don't fail on cache errors.
  const { token, cacheTtlSec } = await fetchFreshToken();
  try {
    await redis.set(CACHE_KEY, token, "EX", cacheTtlSec);
  } catch {
    // Cache write failure is non-fatal
  }
  return token;
}
