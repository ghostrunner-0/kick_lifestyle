// /app/api/product/get/[id]/route.js
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";
import "@/models/Category.model"; // ensure Category is registered for populate
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "unauthorized");

    await connectDB();

    const { id } = params || {};
    if (!isValidObjectId(id)) {
      return response(false, 400, "Invalid product ID");
    }

    // Fetch product
    const product = await Product.findById(id)
      .select(
        "name slug shortDesc category mrp specialPrice warrantyMonths showInWebsite heroImage productMedia descImages additionalInfo createdAt updatedAt deletedAt"
      )
      .populate({
        path: "category",
        select: "_id name slug",
        model: "Category",
      })
      .lean();

    if (!product || product.deletedAt) {
      return response(false, 404, "Product not found");
    }

    // Fetch variants for this product (not deleted)
    const variants = await ProductVariant.find({
      product: id,
      deletedAt: null,
    })
      .select(
        "product variantName mrp specialPrice sku swatchImage productGallery createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Attach variants to the product payload
    const payload = { ...product, variants };

    return response(true, 200, "Product found", payload);
  } catch (error) {
    return catchError(error);
  }
}
