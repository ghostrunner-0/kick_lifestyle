import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import StudentDiscount from "@/models/StudentDiscount.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // pending|approved|rejected
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

    const query = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    const items = await StudentDiscount.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json(
      { success: true, data: { items } },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/admin/student-discount error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}
