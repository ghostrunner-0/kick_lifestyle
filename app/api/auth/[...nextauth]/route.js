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

/* ===================== ENV VARS ===================== */
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  NEXTAUTH_URL: _NEXTAUTH_URL,
  NEXTAUTH_SECRET,
  SECRET_KEY: _SECRET_KEY,
  NODE_ENV,
} = process.env;

const isProd = NODE_ENV === "production";
const hasGoogleOAuth = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

if (!hasGoogleOAuth) {
  console.warn(
    "[auth] Google OAuth env vars missing; Google login disabled" +
      (isProd ? " (set GOOGLE_CLIENT_ID/SECRET in production)." : ".")
  );
}

if (isProd && !_NEXTAUTH_URL) {
  console.warn(
    "[auth] NEXTAUTH_URL not set; defaulting to http://localhost:3000 for build."
  );
}

if (isProd && !(_SECRET_KEY || NEXTAUTH_SECRET)) {
  console.warn(
    "[auth] NEXTAUTH_SECRET/SECRET_KEY missing; using a fallback development secret."
  );
}

const NEXTAUTH_URL = _NEXTAUTH_URL || "http://localhost:3000";
const SECRET_KEY = _SECRET_KEY || NEXTAUTH_SECRET || "development-secret";

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

/* ===================== CUSTOM COOKIE ===================== */
async function setNextAuthCookie(userDoc) {
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
    sameSite: "lax",
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: 60 * 60 * 24 * 365,
  });

  return token;
}

const nextAuthFactory =
  typeof NextAuth === "function" ? NextAuth : NextAuth?.default;
const googleProviderFactory =
  typeof GoogleProvider === "function"
    ? GoogleProvider
    : GoogleProvider?.default;
const credentialsProviderFactory =
  typeof CredentialsProvider === "function"
    ? CredentialsProvider
    : CredentialsProvider?.default;

if (typeof nextAuthFactory !== "function") {
  throw new Error("next-auth default export is not a function");
}

const providers = [];

if (hasGoogleOAuth && typeof googleProviderFactory === "function") {
  providers.push(
    googleProviderFactory({
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
    })
  );
} else if (hasGoogleOAuth) {
  console.warn(
    "[auth] Google provider import missing default factory; Google login disabled."
  );
}

if (typeof credentialsProviderFactory !== "function") {
  throw new Error("next-auth credentials provider factory missing");
}

providers.push(
  credentialsProviderFactory({
    name: "OTP",
    credentials: {
      email: { label: "Email", type: "text" },
      otp: { label: "OTP", type: "text" },
    },
    async authorize(credentials) {
      await connectDB();

      const parsed = authValidationSchema.safeParse(credentials);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || "Invalid input");
      }

      const { email, otp } = parsed.data;

      if (!/^\d{4,8}$/.test(String(otp))) {
        throw new Error("Invalid OTP");
      }

      // fetch user
      const user = await User.findOne({ email, deletedAt: null }).lean();
      if (!user) throw new Error("User not found");

      // 🚫 block legacy/WP users from OTP signin -> force password reset
      if (user.provider === "wordpress" || user?.legacy?.hash) {
        throw new Error("Password reset required");
      }

      // Validate OTP: not expired & not used
      const now = new Date();
      const otpRecord = await OTP.findOne({
        email,
        otp,
        expiresAt: { $gt: now },
        used: { $ne: true },
      }).lean();

      if (!otpRecord) {
        throw new Error("Invalid or expired OTP");
      }

      // mark used
      await OTP.updateOne({ _id: otpRecord._id }, { $set: { used: true } });

      // convenience cookie
      await setNextAuthCookie(user);

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role || "user",
      };
    },
  })
);

export const authOptions = {
  secret: SECRET_KEY,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 365 },
  jwt: { maxAge: 60 * 60 * 24 * 365 },
  providers,

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

          await setNextAuthCookie(user);
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
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
};

const handler = nextAuthFactory(authOptions);
export { handler as GET, handler as POST };
