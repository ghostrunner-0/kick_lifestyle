// app/api/auth/check/route.js
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/Authentication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED = new Set(["admin", "sales", "editor"]);

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin portal access required" },
        { status: 401 }
      );
    }

    const role = String(user.role || "").toLowerCase();
    if (!ALLOWED.has(role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden for role", data: { role } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      role,
      data: { role, id: user._id ?? null, email: user.email ?? null, name: user.name ?? null },
    });
  } catch (e) {
    console.error("/api/auth/check error:", e);
    return NextResponse.json(
      { success: false, message: "Auth check failed" },
      { status: 500 }
    );
  }
}
