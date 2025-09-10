import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import OfflineRegistrationRequest from "@/models/OfflineRegistrationRequest.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    // ✅ allow admin + sales
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "admin not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // pending|approved|rejected
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));

    const query = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    const items = await OfflineRegistrationRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json({ success: true, data: { items } }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/offline-registration error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
