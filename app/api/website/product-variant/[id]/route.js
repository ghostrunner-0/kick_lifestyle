// /app/api/website/product-variant/[id]/route.js
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import ProductVariant from "@/models/ProductVariant.model";
import "@/models/Product.model"; // register Product for populate
import { isValidObjectId } from "mongoose";
export const dynamic = "force-dynamic";
export const revalidate = 0;


/** sanitize special price (optional, non-negative, <= mrp) */
function cleanSpecialPrice(sp, mrp) {
  if (sp === undefined || sp === null || sp === "") return undefined;
  const n = Number(sp), m = Number(mrp);
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (Number.isFinite(m) && n > m) return undefined;
  return n;
}

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const param = await params;
    const { id } = param || {};
    if (!id) return response(false, 400, "Missing variant id/sku");

    // Match either by _id or by SKU (uppercased)
    const match = { deletedAt: null };
    if (isValidObjectId(id)) match._id = id;
    else match.sku = String(id).trim().toUpperCase();

    const variant = await ProductVariant.findOne(match)
      .select(
        [
          "product",
          "variantName",
          "mrp",
          "specialPrice",
          "stock",
          "sku",
          "swatchImage",
          "productGallery",
          "deletedAt",
          "createdAt",
          "updatedAt",
        ].join(" ")
      )
      .populate({
        path: "product",
        select: "_id name slug showInWebsite deletedAt",
        model: "Product",
      })
      .lean();

    if (!variant) return response(false, 404, "Product variant not found");
    if (!variant.product || variant.product.deletedAt || !variant.product.showInWebsite) {
      return response(false, 404, "Parent product not available");
    }

    const swatchImage = variant?.swatchImage
      ? { path: String(variant.swatchImage.path || "") }
      : undefined;

    const productGallery = Array.isArray(variant?.productGallery)
      ? variant.productGallery.map((m) => ({ path: String(m.path || "") }))
      : [];

    const data = {
      _id: String(variant._id),
      product: {
        _id: String(variant.product._id),
        name: variant.product.name,
        slug: variant.product.slug,
      },
      variantName: variant.variantName,
      sku: variant.sku,
      mrp: Number(variant.mrp),
      specialPrice: cleanSpecialPrice(variant.specialPrice, variant.mrp),
      stock: Number(variant.stock ?? 0),
      swatchImage,
      productGallery,
    };

    return response(true, 200, "Product variant found", data);
  } catch (err) {
    return catchError(err);
  }
}
