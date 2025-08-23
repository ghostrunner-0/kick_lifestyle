// app/api/auth/me/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/DB";
import User from "@/models/User.model";

export const dynamic = "force-dynamic";

/** pick only safe fields for the client */
function publicUser(u = {}) {
  const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
  const isAdmin =
    u?.isAdmin === true ||
    u?.role === "admin" ||
    roles.includes("admin");

  return {
    _id: String(u._id || ""),
    name: u.name || u.fullName || "",
    email: u.email || "",
    phone: u.phone || u.mobile || "",
    image: u.image || u.avatar || u.avatarUrl || "",
    role: u.role || "",
    roles,
    isAdmin,
    // optional quality-of-life flags
    emailVerified: !!u.emailVerified,
    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, statusCode: 401, message: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({
      email: session.user.email,
      deletedAt: null,
    })
      .select(
        "_id name fullName email phone mobile image avatar avatarUrl role roles isAdmin emailVerified createdAt updatedAt"
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, statusCode: 404, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      statusCode: 200,
      message: "OK",
      data: publicUser(user),
    });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return NextResponse.json(
      { success: false, statusCode: 500, message: "Failed to resolve user" },
      { status: 500 }
    );
  }
}
