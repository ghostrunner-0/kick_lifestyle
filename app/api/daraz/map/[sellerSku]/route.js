// /app/api/daraz/map/[sellerSku]/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import DarazProductMap from "@/models/DarazProductMap.model";

export const runtime = "nodejs";

export async function DELETE(_req, { params }) {
  try {
    const staff = await isAuthenticated(["admin"]);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();
    const sellerSku = params?.sellerSku;
    if (!sellerSku) return NextResponse.json({ error: "Missing sellerSku" }, { status: 400 });

    const res = await DarazProductMap.deleteOne({ seller_sku: sellerSku });
    return NextResponse.json({ ok: true, deletedCount: res.deletedCount || 0 });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Delete mapping failed" }, { status: 500 });
  }
}
