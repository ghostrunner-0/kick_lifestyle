import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/DB";
import OTP from "@/models/OTP.model";
import User from "@/models/User.model";
import { zSchema } from "@/lib/zodSchema";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SECRET_KEY = process.env.SECRET_KEY;

// Validate credentials (email + otp)
const authValidationSchema = zSchema.pick({ email: true, otp: true });

/** Write our long-lived cookie (await cookies() to fix Next warning). */
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

  const store = await cookies(); // ⬅️ important: await
  store.set({
    name: "next-auth.session-token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return token;
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
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
          throw new Error(parsed.error.errors[0]?.message || "Invalid input");
        }

        const { email, otp } = parsed.data;
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) throw new Error("Invalid OTP");

        const user = await User.findOne({
          email,
          isEmailVerified: true,
          deletedAt: null,
        }).lean();
        if (!user) throw new Error("User not found or email not verified");

        await OTP.deleteOne({ _id: otpRecord._id });

        // mirror cookie behavior for credentials
        await setNextAuthCookie(user);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || "user", // "admin" | "sales" | "editor" | "user"
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365,
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 365,
  },

  callbacks: {
    // Ensure Google users exist & set our cookie too
    async signIn({ account, profile }) {
      try {
        await connectDB();

        if (account?.provider === "google" && profile?.email) {
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

    // Put id/role into token, hydrate if needed
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
          const u = await User.findOne({ email: token.email, deletedAt: null }).lean();
          if (u) {
            token.id = u._id?.toString();
            token.role = u.role || "user";
            token.name = u.name || token.name;
          }
        } catch (e) {
          console.error("jwt callback hydrate error:", e?.message);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role || "user"; // "admin" | "sales" | "editor" | "user"
      }
      return session;
    },

    /**
     * Redirect rules:
     * - Default everyone to /account (fixes old /my-account).
     * - If a safe callbackUrl within site is provided, honor it but normalize /my-account -> /account.
     */
    async redirect({ url, baseUrl }) {
      try {
        // external URLs: block, go home
        const isExternal = !url.startsWith(baseUrl);
        if (isExternal) return baseUrl;

        // normalize legacy my-account
        const normalized = url.replace(/\/my-account\/?$/i, "/account");

        // If NextAuth gives just the site root, send to /account
        if (normalized === baseUrl || normalized === `${baseUrl}/`) {
          return `${baseUrl}/account`;
        }

        return normalized;
      } catch {
        return `${baseUrl}/account`;
      }
    },
  },

  pages: {
    signIn: "/auth/login",
  },

  secret: SECRET_KEY,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
