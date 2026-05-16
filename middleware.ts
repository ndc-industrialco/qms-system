import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/auth/login", "/auth/error", "/unauthorized"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;

  // Always allow public pages
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Not logged in — block everything
  if (!session?.user) {
    const isApiRequest =
      req.headers.get("accept")?.includes("application/json") ||
      req.headers.get("content-type")?.includes("application/json") ||
      path.includes("/api/");

    if (isApiRequest) {
      return NextResponse.json(
        { data: null, error: "Unauthorized — Microsoft 365 login required" },
        { status: 401 },
      );
    }

    const url = new URL("/auth/login", req.url);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // Logged in but no M365 account linked
  if (!session.user.msUserId) {
    const url = new URL("/unauthorized", req.url);
    url.searchParams.set("reason", "no_m365_account");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
