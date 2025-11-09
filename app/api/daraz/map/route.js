// /app/api/daraz/map/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import DarazProductMap from "@/models/DarazProductMap.model";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    const {
      // Daraz side
      seller_sku,
      daraz_sku_id,
      daraz_item_id,
      daraz_status,
      daraz_name,

      // Website side
      product_id,
      variant_id, // optional
      product_name,
      variant_name,

      // optional meta
      warranty_months,
      notes,
    } = body || {};

    if (!seller_sku || !product_id) {
      return NextResponse.json(
        { error: "seller_sku and product_id are required" },
        { status: 400 }
      );
    }

    const doc = await DarazProductMap.findOneAndUpdate(
      { seller_sku },
      {
        $set: {
          seller_sku,
          daraz_sku_id: daraz_sku_id || "",
          daraz_item_id: daraz_item_id || "",
          daraz_status: daraz_status || "",
          daraz_name: daraz_name || "",

          product_id,
          variant_id: variant_id || null,
          product_name: product_name || "",
          variant_name: variant_name || "",

          warranty_months: warranty_months ?? null,
          notes: notes || "",
          updated_by: staff._id,
        },
        $setOnInsert: {
          created_by: staff._id,
        },
      },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ ok: true, map: doc });
  } catch (err) {
    console.error("Save mapping failed:", err);
    return NextResponse.json(
      { error: err?.message || "Save mapping failed" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(10, Number(searchParams.get("pageSize") || 50))
    );

    const filter = {};
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { seller_sku: regex },
        { daraz_name: regex },
        { product_name: regex },
        { variant_name: regex },
      ];
    }

    const total = await DarazProductMap.countDocuments(filter);
    const docs = await DarazProductMap.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return NextResponse.json({
      items: docs,
      paging: { page, pageSize, total },
    });
  } catch (err) {
    console.error("List mappings failed:", err);
    return NextResponse.json(
      { error: err?.message || "List mappings failed" },
      { status: 500 }
    );
  }
}
