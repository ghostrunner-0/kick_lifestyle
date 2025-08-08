// /app/api/product-variant/export/route.js
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import ProductVariant from "@/models/ProductVariant.model";
import "@/models/Product.model"; // ensure Product is registered for populate

export async function GET(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    // Get all non-deleted variants, newest first
    const variants = await ProductVariant.find({ deletedAt: null })
      .select("product variantName mrp specialPrice sku swatchImage productGallery createdAt updatedAt")
      .populate({ path: "product", select: "name slug _id" })
      .sort({ createdAt: -1 })
      .lean();

    // Flatten for export
    const exportRows = variants.map((v) => ({
      productId: v.product?._id ?? null,
      productName: v.product?.name ?? null,
      productSlug: v.product?.slug ?? null,

      variantName: v.variantName ?? "",
      sku: v.sku ?? "",
      mrp: v.mrp ?? null,
      specialPrice: v.specialPrice ?? null,

      // swatch image (single)
      swatchImagePath: v.swatchImage?.path ?? null,
      swatchImageAlt: v.swatchImage?.alt ?? "",

      // gallery summary
      productGalleryCount: Array.isArray(v.productGallery) ? v.productGallery.length : 0,

      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    return response(true, 200, "Product variants exported successfully", exportRows);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
