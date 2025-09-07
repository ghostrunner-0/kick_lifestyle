import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Product from "@/models/Product.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find(
      { deletedAt: null }, // ignore showInWebsite, but skip deleted
      { name: 1, modelNumber: 1, heroImage: 1 } // minimal fields
    )
      .sort({ name: 1 })
      .lean()
      .exec();

    return NextResponse.json({ success: true, data: products || [] }, { status: 200 });
  } catch (e) {
    console.error("GET /offline-registeration/products error:", e);
    return NextResponse.json({ success: false, message: "Failed to load products" }, { status: 500 });
  }
}
