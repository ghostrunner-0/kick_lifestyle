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
    const param = await params;
    const slug = String(param?.slug || "").trim().toLowerCase();
    if (!slug) return response(false, 400, "Invalid or missing product slug");

    // 1) Find public product by slug
    const product = await Product.findOne({
      slug,
      showInWebsite: true,   // NOTE: your Product schema uses showInWebsite
      deletedAt: null,
    })
      .select(
        "_id name slug shortDesc category mrp specialPrice warrantyMonths stock showInWebsite productMedia descImages heroImage additionalInfo modelNumber createdAt updatedAt"
      )
      // Do NOT filter category visibility here; we'll report a flag instead.
      .populate({
        path: "category",
        select: "_id name slug showOnWebsite deletedAt",
      })
      .lean();

    if (!product) {
      // Helpful debug: was it found if we ignored visibility?
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

    // 2) Mark whether the category is visible (but don't 404 because of it)
    const cat = product.category || null;
    const categoryVisible = !!(cat && cat.deletedAt == null && cat.showOnWebsite === true);

    // 3) Optionally include variants
    if (includeVariants) {
      const variants = await ProductVariant.find({
        product: product._id,
        deletedAt: null,
      })
        .select("_id variantName sku mrp specialPrice productGallery swatchImage createdAt updatedAt")
        .lean();
      product.variants = variants || [];
    }

    // 4) Attach the flag so UI can decide what to do
    return response(true, 200, "Product found", {
      ...product,
      categoryVisible,
    });
  } catch (err) {
    return catchError(err, "Failed to fetch product");
  }
}
