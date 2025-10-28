// app/api/products/route.js (or app/api/search-index/route.js)
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Product from "@/models/Product.model";
import Category from "@/models/Category.model";
import ProductVariant from "@/models/ProductVariant.model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const rows = await Product.aggregate([
      { $match: { showInWebsite: true, deletedAt: null } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "cat",
          pipeline: [
            { $project: { _id: 0, name: 1, slug: 1, showOnWebsite: 1 } },
          ],
        },
      },
      {
        $lookup: {
          from: "productVariants",
          localField: "_id",
          foreignField: "product",
          as: "vars",
          pipeline: [
            { $match: { deletedAt: null } },
            { $project: { _id: 0, sku: 1, stock: 1 } },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          slug: 1,
          name: 1,
          modelNumber: 1,
          mrp: 1,
          specialPrice: 1,
          stock: 1,
          categoryName: { $ifNull: [{ $first: "$cat.name" }, ""] },
          categorySlug: { $ifNull: [{ $first: "$cat.slug" }, ""] },
          imageUrl: {
            $ifNull: [
              "$heroImage.path",
              { $arrayElemAt: ["$productMedia.path", 0] },
            ],
          },
          sku: { $ifNull: [{ $arrayElemAt: ["$vars.sku", 0] }, ""] },
          skus: "$vars.sku",
        },
      },
      {
        $addFields: {
          price: { $ifNull: ["$specialPrice", "$mrp"] },
          href: { $concat: ["/product/", "$slug"] },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $limit: 5000 },
    ]);

    const products = rows.map((r) => ({
      id: String(r._id),
      slug: r.slug,
      name: r.name,
      sku: r.sku,
      skus: r.skus || [],
      category: r.categoryName,
      categorySlug: r.categorySlug,
      imageUrl: r.imageUrl || "",
      price: r.price,
      stock: r.stock ?? 0,
      href: r.href,
    }));

    return new NextResponse(
      JSON.stringify({
        success: true,
        version: new Date().toISOString(),
        products,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("search-index error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to build search index" },
      { status: 500 }
    );
  }
}
