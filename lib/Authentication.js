// For Server Side or API routes
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/DB";
import User from "@/models/User.model"; // adjust path if needed

export const isAuthenticated = async (allowedRoles) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return false;

    // Ensure DB connection
    await connectDB();

    // Find user by email and ensure not soft-deleted
    const userInDb = await User.findOne({
      email: session.user.email,
      deletedAt: null,
    }).lean();

    if (!userInDb) return false;

    // If allowedRoles is specified, check if user's role is allowed
    if (allowedRoles) {
      if (Array.isArray(allowedRoles)) {
        if (!allowedRoles.includes(userInDb.role)) return false;
      } else {
        if (userInDb.role !== allowedRoles) return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Auth check failed:", error);
    return false;
  }
};
