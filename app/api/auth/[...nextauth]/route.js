import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/DB";
import OTP from "@/models/OTP.model";
import User from "@/models/User.model";
import { zSchema } from "@/lib/zodSchema";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SECRET_KEY = process.env.SECRET_KEY;

// Zod schema for validating credentials
const authValidationSchema = zSchema.pick({
  email: true,
  otp: true,
});

// Helper to set next-auth JWT cookie manually (same as next-auth)
async function setNextAuthCookie(user) {
  const token = jwt.sign(
    {
      id: user._id?.toString() || user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    SECRET_KEY,
    {
      expiresIn: "365d", // 1 year
    }
  );

  // Set cookie using next/headers cookies API
  cookies().set({
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
    }),

    CredentialsProvider({
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        await connectDB();

        const parseResult = authValidationSchema.safeParse(credentials);
        if (!parseResult.success) {
          throw new Error(parseResult.error.errors[0].message);
        }

        const { email, otp } = parseResult.data;

        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
          throw new Error("Invalid OTP");
        }

        const user = await User.findOne({
          email,
          isEmailVerified: true,
          deletedAt: null,
        }).lean();

        if (!user) {
          throw new Error("User not found or email not verified");
        }

        await OTP.deleteOne({ _id: otpRecord._id });

        // Set next-auth JWT cookie manually here
        await setNextAuthCookie(user);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 365,
  },

  callbacks: {
    async signIn({ account, profile }) {
      try {
        await connectDB();

        if (account?.provider === "google" && profile?.email) {
          const existingUser = await User.findOne({ email: profile.email });
          if (!existingUser) {
            await User.create({
              name: profile.name,
              email: profile.email,
              provider: "google",
              isEmailVerified: true,
            });
          }
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || user._id?.toString();
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
  },

  secret: SECRET_KEY,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
