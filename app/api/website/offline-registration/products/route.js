// app/api/website/offline-registration/products/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Product from "@/models/Product.model";            // collection: "Products"
import ProductVariant from "@/models/ProductVariant.model"; // collection: "productVariants"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    // includeVariants defaults to true => pass ?includeVariants=0 to skip the $lookup
    const includeVariants = searchParams.get("includeVariants") !== "0";

    // Optional: fetch just one product (helps if you later want lazy-load)
    const productId = searchParams.get("productId");

    if (!includeVariants) {
      // Lightweight list without variants
      const baseProjection = {
        name: 1,
        modelNumber: 1,
        heroImage: 1,
        hasVariants: 1,
        deletedAt: 1,
      };

      const query = { deletedAt: null };
      if (productId) query._id = productId;

      const products = await Product.find(query, baseProjection)
        .sort({ name: 1 })
        .lean()
        .exec();

      return NextResponse.json({ success: true, data: products || [] }, { status: 200 });
    }

    // With variants joined from the separate collection
    const matchStage = { $match: { deletedAt: null } };
    if (productId) matchStage.$match._id = new ProductVariant.db.base.Types.ObjectId(productId);

    const pipeline = [
      matchStage,
      { $sort: { name: 1 } },
      {
        $project: {
          name: 1,
          modelNumber: 1,
          heroImage: 1,
          hasVariants: 1,
          // you can include more fields if your UI needs them
        },
      },
      {
        $lookup: {
          from: "productVariants", // <- exact collection name in your model
          let: { pid: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ["$product", "$$pid"] },
              { $eq: ["$deletedAt", null] }
            ]}}},
            { $project: { _id: 1, variantName: 1, sku: 1 } },
            { $sort: { variantName: 1 } },
          ],
          as: "variants",
        },
      },
    ];

    const products = await Product.aggregate(pipeline).exec();

    return NextResponse.json(
      { success: true, data: products || [] },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /offline-registration/products error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to load products" },
      { status: 500 }
    );
  }
}
