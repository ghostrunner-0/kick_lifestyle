// app/api/website/category/route.js
import { NextResponse } from "next/server";
import Category from "@/models/Category.model";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { connectDB } = await import("@/lib/DB");
    await connectDB();

    const pipeline = [
      { $match: { showOnWebsite: true, deletedAt: null } },
      // put the pinned slug first
      {
        $addFields: {
          __priority: {
            $cond: [{ $eq: ["$slug", "true-wireless-earbuds"] }, 0, 1],
          },
        },
      },
      // then newest first within each priority bucket
      { $sort: { __priority: 1, createdAt: -1 } },
      { $project: { __priority: 0 } },
    ];

    const categories = await Category.aggregate(pipeline).exec();
    return NextResponse.json({ success: true, data: categories ?? [] }, { status: 200 });
  } catch (e) {
    console.error("GET /website/category failed:", e);
    return NextResponse.json(
      { success: false, message: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
