// /app/api/product-variant/[id]/route.js
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import ProductVariant from "@/models/ProductVariant.model";
import "@/models/Product.model"; // ensure Product is registered for populate
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "unauthorized");

    await connectDB();

    const { id } = params || {};
    if (!id) return response(false, 400, "Missing variant id/sku");

    // Build matcher: prefer ObjectId, otherwise treat incoming as SKU
    let match = { deletedAt: null };
    if (isValidObjectId(id)) {
      match._id = id;
    } else {
      match.sku = String(id).trim().toUpperCase();
    }

    const variant = await ProductVariant.findOne(match)
      .select(
        "product variantName mrp specialPrice sku swatchImage productGallery createdAt updatedAt"
      )
      .populate({
        path: "product",
        select: "_id name slug",
        model: "Product",
      })
      .lean();

    if (!variant) {
      return response(false, 404, "Product variant not found");
    }

    return response(true, 200, "Product variant found", variant);
  } catch (error) {
    return catchError(error);
  }
}
