import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";
import Category from "@/models/Category.model";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isObjectIdLike(val) {
  return !!val && /^[a-f\d]{24}$/i.test(val);
}

// Helper: get effective price for filtering
function getEffPrice(product) {
  if (
    typeof product?.specialPrice === "number" &&
    product.specialPrice > 0
  )
    return product.specialPrice;
  return product?.mrp ?? 0;
}

// Helper: infer in-stock status
function inferInStock(product) {
  if (typeof product?.inStock === "boolean") return product.inStock;
  if (Number.isFinite(product?.stock)) return product.stock > 0;
  if (Number.isFinite(product?.inventory)) return product.inventory > 0;
  if (Number.isFinite(product?.quantity)) return product.quantity > 0;
  if (Array.isArray(product?.variants)) {
    return product.variants.some((v) =>
      typeof v?.inStock === "boolean"
        ? v.inStock
        : Number.isFinite(v?.stock)
        ? v.stock > 0
        : false
    );
  }
  return true;
}

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const categoryParam = url.searchParams.get("category");
    if (!categoryParam) {
      return NextResponse.json(
        { success: false, message: "Missing ?category=<slug|id> query param" },
        { status: 400 }
      );
    }

    // Resolve category _id
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
      if (catDoc && catDoc._id) categoryId = catDoc._id;
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: true, data: [], category: null },
        { status: 200 }
      );
    }

    // Read filters from query
    const priceParam = url.searchParams.get("price");
    const warrantyParam = url.searchParams.get("warranty");
    const stockParam = url.searchParams.get("stock");

    // Build match object for aggregation
    const match = {
      category: categoryId,
      showInWebsite: true,
      deletedAt: null,
    };

    if (warrantyParam) {
      match.warrantyMonths = { $gte: Number(warrantyParam) };
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: match },
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
          from: ProductVariant.collection.name,
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
                stock: 1,
                inStock: 1,
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
    ];

    let products = await Product.aggregate(pipeline).exec();

    // Filter by price (client-side, since price can be in variant or product)
    if (priceParam) {
      const [min, max] = priceParam.split("-").map(Number);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        products = products.filter((p) => {
          // Check variants first
          if (Array.isArray(p.variants) && p.variants.length) {
            return p.variants.some((v) => {
              const price = typeof v.specialPrice === "number" && v.specialPrice > 0 ? v.specialPrice : v.mrp;
              return price >= min && price <= max;
            });
          }
          // Fallback to product price
          const price = getEffPrice(p);
          return price >= min && price <= max;
        });
      }
    }

    // Filter by stock (client-side)
    if (stockParam === "in") {
      products = products.filter((p) => inferInStock(p));
    }

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