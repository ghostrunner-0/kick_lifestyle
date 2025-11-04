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

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)
  throw new Error("Missing Google OAuth env vars.");
if (!NEXTAUTH_SECRET && !_SECRET_KEY)
  throw new Error("Missing NEXTAUTH_SECRET or SECRET_KEY.");
if (!_NEXTAUTH_URL) throw new Error("Missing NEXTAUTH_URL.");

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

/* ===================== NEXTAUTH CONFIG ===================== */
export const authOptions = {
  secret: NEXTAUTH_SECRET || SECRET_KEY,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 365 },
  jwt: { maxAge: 60 * 60 * 24 * 365 },

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

    /* ============ OTP LOGIN DEBUG AREA ============ */
    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        console.log("🔹 OTP Login Attempt:", credentials);

        await connectDB();
        console.log("✅ MongoDB connected");

        const parsed = authValidationSchema.safeParse(credentials);
        if (!parsed.success) {
          console.error("❌ Zod validation failed:", parsed.error.errors);
          throw new Error(
            parsed.error.errors[0]?.message || "Invalid credentials"
          );
        }

        const { email, otp } = parsed.data;
        console.log("📩 Parsed Credentials -> Email:", email, "| OTP:", otp);

        if (!/^\d{4,8}$/.test(String(otp))) {
          console.warn("⚠️ OTP format invalid");
          throw new Error("Invalid OTP");
        }

        console.log("🔍 Searching OTP in DB...");
        const otpRecord = await OTP.findOne({ email, otp }).lean();
        if (!otpRecord) {
          console.warn("❌ No OTP record found for:", email);
          throw new Error("Invalid OTP");
        }

        console.log("✅ OTP found:", otpRecord);

        // optional expiry check
        // if (otpRecord.expiresAt && new Date(otpRecord.expiresAt) < new Date()) {
        //   console.warn("⚠️ OTP expired:", otpRecord.expiresAt);
        //   throw new Error("OTP expired");
        // }

        console.log("🔍 Fetching user for email:", email);
        const user = await User.findOne({
          email,
          isEmailVerified: true,
          deletedAt: null,
        }).lean();

        if (!user) {
          console.warn("❌ User not found or not verified:", email);
          throw new Error("User not found or not verified");
        }

        console.log("✅ User found:", user._id.toString());

        console.log("🗑️ Deleting used OTP...");
        await OTP.deleteOne({ _id: otpRecord._id });
        console.log("✅ OTP deleted");

        console.log("🍪 Setting NextAuth cookie...");
        await setNextAuthCookie(user);
        console.log("✅ Cookie set successfully");

        console.log("🎉 OTP Login Success for:", email);
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
        console.log("🌐 signIn callback (provider):", account?.provider);
        await connectDB();

        if (account?.provider === "google" && profile?.email) {
          const emailVerified =
            typeof profile.email_verified === "boolean"
              ? profile.email_verified
              : true;
          if (!emailVerified) {
            console.warn("⚠️ Google email not verified");
            return false;
          }

          let user = await User.findOne({
            email: profile.email,
            deletedAt: null,
          });

          if (!user) {
            console.log("🆕 Creating new Google user:", profile.email);
            user = await User.create({
              name: profile.name,
              email: profile.email,
              provider: "google",
              isEmailVerified: true,
              role: "user",
            });
          }

          await setNextAuthCookie(user);
          console.log("✅ Google user cookie set");
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
        console.log("💾 JWT updated with user info:", token.email);
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
            console.log("💾 JWT hydrated from DB:", token.email);
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
      console.log("🧾 Session generated for:", session.user.email);
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
  