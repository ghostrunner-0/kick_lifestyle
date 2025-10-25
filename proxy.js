// proxy.js  (or src/proxy.js)
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // guard (future-proof if you add more matchers later)
  if (!pathname.startsWith("/auth/login")) {
    return NextResponse.next();
  }

  // fast path: if there’s no session cookie, skip JWT decode
  const hasSessionCookie =
    req.cookies.has("__Secure-next-auth.session-token") ||
    req.cookies.has("next-auth.session-token");

  if (!hasSessionCookie) {
    return NextResponse.next();
  }

  // decode only when needed
  const token = await getToken({ req, secret: process.env.SECRET_KEY });

  if (token) {
    const dest = token.role === "admin" ? "/admin/dashboard" : "/account";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/login"],
};
