// /app/api/daraz/map/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import DarazProductMap from "@/models/DarazProductMap.model";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const body = await req.json();
    const {
      seller_sku,
      daraz_sku_id,
      daraz_item_id,
      daraz_status,
      product_id,
      variant_id,
      product_name,
      variant_name,
      notes,
    } = body || {};

    if (!seller_sku || !product_id) {
      return NextResponse.json({ error: "seller_sku and product_id are required" }, { status: 400 });
    }

    const doc = await DarazProductMap.findOneAndUpdate(
      { seller_sku },
      {
        $set: {
          seller_sku,
          daraz_sku_id,
          daraz_item_id,
          daraz_status,
          product_id,
          variant_id: variant_id || null,
          product_name,
          variant_name,
          notes: notes || "",
          updated_by: staff._id,
        },
        $setOnInsert: { created_by: staff._id },
      },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ ok: true, map: doc });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Save mapping failed" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 50)));

    const filter = {};
    if (q) {
      filter.$or = [
        { seller_sku: new RegExp(q, "i") },
        { product_name: new RegExp(q, "i") },
        { variant_name: new RegExp(q, "i") },
      ];
    }

    const total = await DarazProductMap.countDocuments(filter);
    const docs = await DarazProductMap.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return NextResponse.json({ items: docs, paging: { page, pageSize, total } });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "List mappings failed" }, { status: 500 });
  }
}
