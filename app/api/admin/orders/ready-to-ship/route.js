// app/api/admin/orders/ready-to-ship/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

/**
 * GET /api/admin/orders/ready-to-ship
 * Returns all "ready to ship" orders (no params)
 */
export async function GET() {
  try {
    // ✅ Role check: admin or sales
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    await connectDB();

    // ✅ Only ready to ship orders
    const orders = await Order.find({ status:"ready to ship" })
      .sort({ createdAt: -1 })
      .select({
        _id: 1,
        display_order_id: 1,
        display_order_seq: 1,
        createdAt: 1,
        customer: 1,
        customerName: 1,
        customerPhone: 1,
        address: 1,
        items: { $slice: 1 },
        amounts: 1,
        paymentMethod: 1,
        status: 1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    console.error("GET /api/admin/orders/ready-to-ship error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to fetch ready-to-ship orders",
      },
      { status: 500 }
    );
  }
}
