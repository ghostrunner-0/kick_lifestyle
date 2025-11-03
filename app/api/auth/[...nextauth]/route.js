// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/DB";
import OTP from "@/models/OTP.model";
import User from "@/models/User.model";
import { zSchema } from "@/lib/zodSchema";

/* ===================== RUNTIME ===================== */
export const runtime = "nodejs";

/* ===================== ENV VARS (validated) ===================== */
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  NEXTAUTH_URL: _NEXTAUTH_URL,
  NEXTAUTH_SECRET,
  SECRET_KEY: _SECRET_KEY, // optional: for custom cookie signing
  NODE_ENV,
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing Google OAuth env vars.");
}
if (!NEXTAUTH_SECRET && !_SECRET_KEY) {
  throw new Error("Missing NEXTAUTH_SECRET or SECRET_KEY.");
}
if (!_NEXTAUTH_URL) {
  throw new Error("Missing NEXTAUTH_URL. Set it in production.");
}

const NEXTAUTH_URL = _NEXTAUTH_URL;
const SECRET_KEY = _SECRET_KEY || NEXTAUTH_SECRET;

/* ===================== COOKIE DOMAIN ===================== */
let COOKIE_DOMAIN;
try {
  const host = new URL(NEXTAUTH_URL).hostname;
  COOKIE_DOMAIN =
    host && !/^(localhost|127\.0\.0\.1)$/.test(host) ? `.${host}` : undefined;
} catch {
  COOKIE_DOMAIN = undefined;
}

/* ===================== VALIDATION ===================== */
const authValidationSchema = zSchema.pick({ email: true, otp: true });

/* ===================== CUSTOM COOKIE (optional) ===================== */
async function setNextAuthCookie(userDoc) {
  // If you don't need a separate app cookie, you can remove this function + its calls.
  const token = jwt.sign(
    {
      id: userDoc._id?.toString() || userDoc.id,
      email: userDoc.email,
      name: userDoc.name,
      role: userDoc.role || "user",
    },
    SECRET_KEY,
    { expiresIn: "365d" }
  );

  const store = await cookies();
  store.set({
    name: "next-auth.session-token",
    value: token,
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax", // 'strict' can break some OAuth flows
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: 60 * 60 * 24 * 365,
  });

  return token;
}

/* ===================== NEXTAUTH CONFIG ===================== */
export const authOptions = {
  secret: NEXTAUTH_SECRET || SECRET_KEY,

  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 365 },
  jwt: { maxAge: 60 * 60 * 24 * 365 },

  // If you want to override NextAuth's own cookies (optional):
  // cookies: {
  //   sessionToken: {
  //     name:
  //       NODE_ENV === "production"
  //         ? "__Secure-next-auth.session-token"
  //         : "next-auth.session-token",
  //     options: {
  //       httpOnly: true,
  //       sameSite: "lax",
  //       path: "/",
  //       secure: NODE_ENV === "production",
  //       domain: COOKIE_DOMAIN,
  //     },
  //   },
  // },

  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        await connectDB();

        const parsed = authValidationSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error(
            parsed.error.errors[0]?.message || "Invalid credentials"
          );
        }

        const { email, otp } = parsed.data;

        // optional hardening
        if (!/^\d{4,8}$/.test(String(otp))) throw new Error("Invalid OTP");

        const otpRecord = await OTP.findOne({ email, otp }).lean();
        if (!otpRecord) throw new Error("Invalid OTP");

        // optional expiry check if your schema has it
        // if (otpRecord.expiresAt && new Date(otpRecord.expiresAt) < new Date()) {
        //   throw new Error("OTP expired");
        // }

        const user = await User.findOne({
          email,
          isEmailVerified: true,
          deletedAt: null,
        }).lean();

        if (!user) throw new Error("User not found or not verified");

        await OTP.deleteOne({ _id: otpRecord._id }); // invalidate used OTP

        await setNextAuthCookie(user); // remove if unneeded

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || "user",
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      try {
        await connectDB();

        if (account?.provider === "google" && profile?.email) {
          const emailVerified =
            typeof profile.email_verified === "boolean"
              ? profile.email_verified
              : true;
          if (!emailVerified) return false;

          let user = await User.findOne({
            email: profile.email,
            deletedAt: null,
          });

          if (!user) {
            user = await User.create({
              name: profile.name,
              email: profile.email,
              provider: "google",
              isEmailVerified: true,
              role: "user",
            });
          }

          await setNextAuthCookie(user); // remove if unneeded
        }

        return true;
      } catch (e) {
        console.error("signIn callback error:", e);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || user._id?.toString() || token.id;
        token.email = user.email || token.email;
        token.name = user.name || token.name;
        token.role = user.role || token.role || "user";
      }

      if ((!token.id || !token.role) && token?.email) {
        try {
          await connectDB();
          const u = await User.findOne({
            email: token.email,
            deletedAt: null,
          }).lean();
          if (u) {
            token.id = u._id?.toString();
            token.role = u.role || "user";
            token.name = u.name || token.name;
          }
        } catch (e) {
          console.error("jwt hydrate error:", e?.message);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role || "user";
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      try {
        const base = new URL(baseUrl);
        const next = new URL(url, base);

        // same-origin only
        if (next.origin !== base.origin) return baseUrl;

        // normalize /my-account -> /account
        const normalizedPath = next.pathname.replace(
          /\/my-account\/?$/i,
          "/account"
        );
        const result = new URL(normalizedPath + next.search + next.hash, base);

        if (result.pathname === "/" || result.pathname === "") {
          result.pathname = "/account";
        }

        return result.toString();
      } catch {
        return `${baseUrl}/account`;
      }
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
