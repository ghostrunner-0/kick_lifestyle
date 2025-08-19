// app/api/admin/orders/counts/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "processing",
  "pending payment",
  "payment Not Verified",
  "Invalid Payment",
  "cancelled",
  "completed",
  "ready to pack",
  "ready to ship",
];

export async function GET() {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return response(false, 401, "admin not authenticated");

    await connectDB();

    const counts = Object.fromEntries(
      await Promise.all(
        ALLOWED_STATUSES.map(async (s) => {
          const n = await Order.countDocuments({ status: s });
          return [s, n];
        })
      )
    );

    return NextResponse.json({ success: true, data: { counts } });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
