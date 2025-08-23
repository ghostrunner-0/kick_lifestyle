// app/api/admin/warranty/search/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";

const json = (ok, status, payload) =>
  NextResponse.json(ok ? { success: true, data: payload } : { success: false, message: payload }, { status });

const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const digits = (s) => (String(s || "").match(/\d+/g) || []).join("");

export async function GET(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") || 25)));
    if (q.length < 2) return json(true, 200, []);

    const rx = new RegExp(esc(q), "i");
    const qDigits = digits(q);

    const match = {
      $or: [
        { "customer.name": rx },
        ...(qDigits ? [{ "customer.phone": new RegExp("^" + qDigits) }] : []),
        { shopName: rx },
        { displayOrderId: rx },
        { "items.serial": rx },
        ...(mongoose.isValidObjectId(q) ? [{ orderId: new mongoose.Types.ObjectId(q) }] : []),
      ],
    };

    // Use aggregation to compute itemsCount accurately without pulling whole items array to app
    const rows = await WarrantyRegistration.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $project: {
          customerName: "$customer.name",
          customerPhone: "$customer.phone",
          itemsCount: { $size: { $ifNull: ["$items", []] } },
          channel: 1,
          shopName: 1,
          createdAt: 1,
        },
      },
    ]);

    return json(true, 200, rows);
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}
