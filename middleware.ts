import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";
import { isJwtBlocked } from "@/lib/jwt-blocklist";

// ioredis requires Node.js TCP sockets and cannot run in Edge Runtime.
export const runtime = "nodejs";

const { auth } = NextAuth(authConfig);

const AUTH_LIMIT = { limit: 10, windowMs: 60_000 };
const API_LIMIT = { limit: 60, windowMs: 60_000 };

const PUBLIC_PATHS = ["/auth/login", "/auth/error", "/unauthorized"];

type UserRole = "USER" | "IT" | "QMS" | "MR";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function withRequestId(res: NextResponse, requestId: string): NextResponse {
  res.headers.set("X-Request-Id", requestId);
  return res;
}

function tooManyRequests(resetAt: number, requestId: string): NextResponse {
  return withRequestId(
    NextResponse.json(
      { data: null, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      },
    ),
    requestId,
  );
}

export default auth(async (req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;
  const ip = getClientIp(req);
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  if (path.startsWith("/api/")) {
    const config = path.startsWith("/api/auth") ? AUTH_LIMIT : API_LIMIT;
    let rateLimitKey = `api:ip:${ip}:${path}`;

    if (!path.startsWith("/api/auth")) {
      const token = await getToken({ req, secret: process.env.AUTH_SECRET! });
      if (token?.sub) rateLimitKey = `api:user:${token.sub}:${path}`;
    }

    const result = await rateLimit(rateLimitKey, config);
    if (!result.allowed) return tooManyRequests(result.resetAt, requestId);

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return withRequestId(res, requestId);
  }

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    if (session?.user && path === "/auth/login") {
      return withRequestId(NextResponse.redirect(new URL("/", req.url)), requestId);
    }
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

  if (!session?.user) {
    const url = new URL("/auth/login", req.url);
    url.searchParams.set("callbackUrl", path);
    return withRequestId(NextResponse.redirect(url), requestId);
  }

  const jti = session.user.jti;
  if (jti && (await isJwtBlocked(jti))) {
    const url = new URL("/auth/login", req.url);
    url.searchParams.set("callbackUrl", path);
    url.searchParams.set("reason", "session_revoked");
    return withRequestId(NextResponse.redirect(url), requestId);
  }

  const role = (session.user.role ?? "USER") as UserRole;

  if (path.startsWith("/it/") && role !== "IT") {
    return withRequestId(
      NextResponse.redirect(new URL("/unauthorized?reason=insufficient_role", req.url)),
      requestId,
    );
  }

  if (
    path.startsWith("/qms/") &&
    !path.startsWith("/qms/document-controls") &&
    !path.startsWith("/qms/kpi") &&
    role !== "QMS" &&
    role !== "MR" &&
    role !== "IT"
  ) {
    return withRequestId(
      NextResponse.redirect(new URL("/unauthorized?reason=insufficient_role", req.url)),
      requestId,
    );
  }

  return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
});

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.webp|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)",
};
