// app/api/website/category/route.ts (or route.js)
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Category from "@/models/Category.model";

export const revalidate = 0;             // no static caching
export const dynamic = "force-dynamic";  // always fetch on request

export async function GET() {
  try {
    await connectDB(); // ✅ await the connection

    const categories = await Category.find(
      { showOnWebsite: true, deletedAt: null },
      // optional projection to limit fields:
      // "name slug href icon count order showOnWebsite"
    )
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();

    return NextResponse.json(
      { success: true, data: categories ?? [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
