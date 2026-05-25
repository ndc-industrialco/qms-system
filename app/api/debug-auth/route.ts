import { getToken } from "next-auth/jwt";
import { type NextRequest } from "next/server";

// TEMPORARY DEBUG ENDPOINT — remove after diagnosing auth issue
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  return Response.json({
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      AUTH_URL: process.env.AUTH_URL,
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
      AUTH_SECRET_SET: !!process.env.AUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    },
    headers: {
      host: req.headers.get("host"),
      "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
      "x-forwarded-for": req.headers.get("x-forwarded-for"),
      "cf-connecting-ip": req.headers.get("cf-connecting-ip"),
    },
    token: token
      ? {
          role: token.role,
          email: token.email,
          id: token.id,
          m365Verified: token.m365Verified,
          exp: token.exp,
        }
      : null,
    cookieNames: req.cookies.getAll().map((c) => c.name),
  });
}
