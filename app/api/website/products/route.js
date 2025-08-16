// app/api/website/products/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";
import Category from "@/models/Category.model";

export const revalidate = 0;            // no static caching
export const dynamic = "force-dynamic"; // always fetch on request
export const runtime = "nodejs";        // mongoose requires node runtime

function isObjectIdLike(val) {
  return !!val && /^[a-f\d]{24}$/i.test(val);
}

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const categoryParam = url.searchParams.get("category"); // slug or _id
    if (!categoryParam) {
      return NextResponse.json(
        { success: false, message: "Missing ?category=<slug|id> query param" },
        { status: 400 }
      );
    }

    // Resolve category _id from slug or accept ObjectId directly
    let categoryId = null;

    if (isObjectIdLike(categoryParam)) {
      categoryId = new mongoose.Types.ObjectId(categoryParam);
    } else {
      const catDoc = await Category.findOne({
        slug: String(categoryParam).trim().toLowerCase(),
        deletedAt: null,
        showOnWebsite: true,
      })
        .select({ _id: 1 })
        .lean()
        .exec();

      if (catDoc && catDoc._id) {
        categoryId = catDoc._id;
      }
    }

    if (!categoryId) {
      // Category not found -> empty list (200) to keep UX simple
      return NextResponse.json(
        { success: true, data: [], category: null },
        { status: 200 }
      );
    }

    // Aggregation: fetch products in category and attach variants
    const products = await Product.aggregate([
      {
        $match: {
          category: categoryId,
          showInWebsite: true,
          deletedAt: null,
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          shortDesc: 1,
          mrp: 1,
          specialPrice: 1,
          warrantyMonths: 1,
          heroImage: 1,
          productMedia: 1,
          modelNumber: 1,
          createdAt: 1,
          category: 1,
        },
      },
      {
        $lookup: {
          from: ProductVariant.collection.name, // usually "productVariants"
          let: { productId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$product", "$$productId"] } } },
            { $match: { deletedAt: null } },
            {
              $project: {
                variantName: 1,
                mrp: 1,
                specialPrice: 1,
                productGallery: 1,
                swatchImage: 1,
                sku: 1,
                createdAt: 1,
              },
            },
            { $sort: { createdAt: 1 } },
          ],
          as: "variants",
        },
      },
      {
        $lookup: {
          from: Category.collection.name,
          localField: "category",
          foreignField: "_id",
          as: "_category",
        },
      },
      {
        $addFields: {
          category: {
            $cond: [
              { $gt: [{ $size: "$_category" }, 0] },
              {
                $let: {
                  vars: { c: { $arrayElemAt: ["$_category", 0] } },
                  in: { _id: "$$c._id", name: "$$c.name", slug: "$$c.slug" },
                },
              },
              null,
            ],
          },
        },
      },
      { $project: { _category: 0 } },
      { $sort: { createdAt: -1 } },
    ]).exec();

    return NextResponse.json(
      { success: true, category: { _id: categoryId }, data: products },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
