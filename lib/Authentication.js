// lib/Authentication.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/DB";
import User from "@/models/User.model";

/** Get the full user document (or null). */
export const getAuthUser = async () => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    await connectDB();

    const user = await User.findOne({
      email: session.user.email,
      deletedAt: null,
    }).lean();

    return user || null;
  } catch (e) {
    console.error("getAuthUser failed:", e);
    return null;
  }
};

const hasAllowedRole = (user, allowedRoles) => {
  if (!allowedRoles) return true; // no role restriction
  if (!user?.role) return false;

  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(user.role);
  }
  return user.role === allowedRoles;
};

/**
 * ✅ Keep existing behavior: returns **boolean**.
 * Usage (unchanged):
 *   const ok = await isAuthenticated("admin");
 *   if (!ok) return 403;
 */
export const isAuthenticated = async (allowedRoles) => {
  const user = await getAuthUser();
  if (!user) return false;
  return hasAllowedRole(user, allowedRoles);
};

/** Optional convenience if a route only needs the role string. */
export const getUserRole = async () => {
  const user = await getAuthUser();
  return user?.role ?? null;
};
