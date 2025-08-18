// /app/api/website/product/[id]/route.js
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";
import { isValidObjectId, Types } from "mongoose";

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
    const param =await params;
    const { id } = param || {};
    if (!id) return response(false, 400, "Missing product id/slug");

    // Match either by _id or by slug
    const match = { deletedAt: null, showInWebsite: true };
    if (isValidObjectId(id)) match._id = id;
    else match.slug = String(id).trim().toLowerCase();

    // Minimal fields the website/cart needs
    const prod = await Product.findOne(match)
      .select(
        [
          "_id",
          "name",
          "slug",
          "mrp",
          "specialPrice",
          "stock",
          "hasVariants",
          "heroImage",
          "productMedia",
          "deletedAt",
          "showInWebsite",
        ].join(" ")
      )
      .lean();

    if (!prod) return response(false, 404, "Product not found");

    // If hasVariants and stock is missing for any reason, compute as a fallback
    let totalStock = Number(prod.stock ?? 0);
    if (prod.hasVariants && !Number.isFinite(totalStock)) {
      const sums = await ProductVariant.aggregate([
        { $match: { product: new Types.ObjectId(prod._id), deletedAt: null } },
        { $group: { _id: "$product", total: { $sum: "$stock" } } },
      ]);
      totalStock = Number(sums?.[0]?.total ?? 0);
    }

    // Prepare minimal image payloads (paths are enough for your UI)
    const heroImage = prod?.heroImage
      ? { path: String(prod.heroImage.path || "") }
      : undefined;

    const productMedia = Array.isArray(prod?.productMedia)
      ? prod.productMedia.map((m) => ({ path: String(m.path || "") }))
      : [];

    const data = {
      _id: String(prod._id),
      name: prod.name,
      slug: prod.slug,
      mrp: Number(prod.mrp),
      specialPrice: cleanSpecialPrice(prod.specialPrice, prod.mrp),
      stock: totalStock,
      heroImage,
      productMedia,
    };

    return response(true, 200, "Product found", data);
  } catch (err) {
    return catchError(err);
  }
}
