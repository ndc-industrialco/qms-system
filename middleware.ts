import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";

const { auth } = NextAuth(authConfig);

const AUTH_LIMIT = { limit: 10, windowMs: 60_000 };
const API_LIMIT  = { limit: 60, windowMs: 60_000 };

const PUBLIC_PATHS = ["/auth/login", "/auth/error", "/unauthorized"];

type UserRole = "USER" | "IT" | "QMS" | "MR";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function tooManyRequests(resetAt: number): NextResponse {
  return NextResponse.json(
    { data: null, error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
    },
  );
}


export default auth(async (req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;
  const ip = getClientIp(req);

  // ── Rate limit API routes ──────────────────────────────────────────────────
  if (path.startsWith("/api/")) {
    const config = path.startsWith("/api/auth") ? AUTH_LIMIT : API_LIMIT;
    let rateLimitKey = `api:ip:${ip}:${path}`;
    if (!path.startsWith("/api/auth")) {
      const token = await getToken({ req, secret: process.env.AUTH_SECRET! });
      if (token?.sub) rateLimitKey = `api:user:${token.sub}:${path}`;
    }
    const result = rateLimit(rateLimitKey, config);
    if (!result.allowed) return tooManyRequests(result.resetAt);

    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return res;
  }

  // ── Always allow public pages ──────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    // If already logged in and trying to access login page, redirect to dashboard
    if (session?.user && path === "/auth/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // ── Not logged in → login ──────────────────────────────────────────────────
  if (!session?.user) {
    const url = new URL("/auth/login", req.url);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // ── Read role from JWT token (session.user.role is not set at Edge) ─────────
  const token = await getToken({ req, secret: process.env.AUTH_SECRET! });
  const role = (token?.role ?? "USER") as UserRole;

  // ── Root / dashboard → role-based home ────────────────────────────────────
  // Removed redirect so users can access the main Company Center Dashboard
  // if (path === "/" || path === "/dashboard") {
  //   return roleRedirect(role, req);
  // }

  // ── Role-based access control ──────────────────────────────────────────────
  if (path.startsWith("/it/") && role !== "IT") {
    return NextResponse.redirect(new URL("/unauthorized?reason=insufficient_role", req.url));
  }

  if (path.startsWith("/qms/") && role !== "QMS" && role !== "MR" && role !== "IT") {
    return NextResponse.redirect(new URL("/unauthorized?reason=insufficient_role", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
