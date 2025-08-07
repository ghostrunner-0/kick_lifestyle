// For Server Side or API routes
import { cookies } from "next/headers"; // for server components/api routes
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
export const isAuthenticated = async (role) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return false;

    if (role) {
      return session.user.role === role;
    }
    return true;
  } catch (error) {
    console.error("Auth check failed:", error);
    return false;
  }
};  