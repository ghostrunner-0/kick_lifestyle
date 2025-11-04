// app/api/auth/custom-logout/route.js
import { cookies } from "next/headers";

const COOKIE_NAMES = [
  // your custom app cookie from setNextAuthCookie()
  "next-auth.session-token",

  // (optional) cover NextAuth's defaults too, just in case
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "next-auth.csrf-token",
];

export async function POST() {
  const jar = await cookies();

  // Try deleting with common permutations
  for (const name of COOKIE_NAMES) {
    // Default delete (path=/)
    jar.set(name, "", { path: "/", maxAge: 0 });

    // Also try secure prefix style (some setups need explicit secure/sameSite)
    jar.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // If you used a cookie domain (like .yourdomain.com), try that too
    const domain = (() => {
      try {
        const host = new URL(process.env.NEXTAUTH_URL).hostname;
        return host && !/^(localhost|127\.0\.0\.1)$/.test(host)
          ? `.${host}`
          : undefined;
      } catch {
        return undefined;
      }
    })();

    if (domain) {
      jar.set(name, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        domain,
      });
    }
  }

  return new Response(null, { status: 204 });
}
