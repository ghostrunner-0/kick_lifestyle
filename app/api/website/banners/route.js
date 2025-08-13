import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Banner from "@/models/Banner.model";

export async function GET() {
  try {
    await connectDB();

    const banners = await Banner.find({
      active: true,
      deletedAt: null
    })
      .sort({ order: 1 }) // ascending order
      .lean();

    return NextResponse.json({ success: true, data: banners });
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch banners" },
      { status: 500 }
    );
  }
}
