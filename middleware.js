import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.SECRET_KEY });
  const { pathname } = req.nextUrl;

  // If already authenticated, keep them out of the login page
  if (pathname.startsWith("/auth/login") && token) {
    const dest = token.role === "admin" ? "/admin/dashboard" : "/account";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/login"],
};
