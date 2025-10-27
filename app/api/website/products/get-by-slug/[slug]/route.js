// app/api/product/get-by-slug/[slug]/route.js
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

export const dynamic = "force-dynamic";

/**
 * GET /api/product/get-by-slug/:slug
 *
 * Query:
 *   include=none       -> omit variants
 *   include=variants   -> include variants (default)
 *   debug=1            -> include debug hints when 404 happens
 */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const includeParam = url.searchParams.get("include");
    const includeVariants = includeParam !== "none";
    const debug = url.searchParams.get("debug") === "1";

    const { slug: slugParam } = await params;
    const slug = String(slugParam || "")
      .trim()
      .toLowerCase();
    if (!slug) return response(false, 400, "Invalid or missing product slug");

    // 1) Find public product by slug
    const product = await Product.findOne({
      slug,
      showInWebsite: true,
      deletedAt: null,
    })
      .select(
        [
          "_id",
          "name",
          "slug",
          "shortDesc",
          "category",
          "mrp",
          "specialPrice",
          "warrantyMonths",
          // ✅ include inventory flags
          "stock",
          "hasVariants",
          "showInWebsite",
          // media / content
          "productMedia",
          "descImages",
          "heroImage",
          "additionalInfo",
          "modelNumber",
          // timestamps
          "createdAt",
          "updatedAt",
        ].join(" ")
      )
      .populate({
        path: "category",
        select: "_id name slug showOnWebsite deletedAt",
      })
      .lean();

    if (!product) {
      if (debug) {
        const raw = await Product.findOne({ slug })
          .select("_id slug showInWebsite deletedAt")
          .lean();
        return response(false, 404, "Product not found", {
          debug: {
            foundIgnoringVisibility: !!raw,
            showInWebsite: raw?.showInWebsite,
            deletedAt: raw?.deletedAt,
          },
        });
      }
      return response(false, 404, "Product not found");
    }

    // 2) Category visibility flag (UI can decide what to do)
    const cat = product.category || null;
    const categoryVisible = !!(
      cat &&
      cat.deletedAt == null &&
      cat.showOnWebsite === true
    );

    // 3) Optionally include variants (✅ include per-variant stock)
    if (includeVariants) {
      const variants = await ProductVariant.find({
        product: product._id,
        deletedAt: null,
      })
        .select(
          [
            "_id",
            "variantName",
            "sku",
            "mrp",
            "specialPrice",
            "productGallery",
            "swatchImage",
            // ✅ stock on variant
            "stock",
            // timestamps
            "createdAt",
            "updatedAt",
          ].join(" ")
        )
        .lean();

      product.variants = variants || [];
    }

    // 4) Ship the product plus the visibility hint
    return response(true, 200, "Product found", {
      ...product,
      categoryVisible,
    });
  } catch (err) {
    return catchError(err, "Failed to fetch product");
  }
}
