import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import ProductVariant from "@/models/ProductVariant.model";
import Product from "@/models/Product.model";
import { z } from "zod";
import mongoose, { isValidObjectId } from "mongoose";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const imageObject = z.object({
  _id: z.string().min(1),
  alt: z.string().optional(),
  path: z.string().min(1),
});

const updateSchema = z
  .object({
    _id: objectId,
    product: objectId,
    variantName: z.string().trim().min(1),
    mrp: z.coerce.number().positive(),
    // specialPrice optional (validated in superRefine)
    specialPrice: z.union([z.string(), z.number()]).optional(),
    // ✅ include stock for variant
    stock: z.coerce.number().int().min(0, "Stock must be an integer ≥ 0"),
    productGallery: z.array(imageObject).min(1),
    swatchImage: imageObject.optional(),
    sku: z.string().trim().min(1),
  })
  .superRefine((v, ctx) => {
    if (v.specialPrice !== undefined && v.specialPrice !== "") {
      const sp = Number(v.specialPrice);
      if (Number.isNaN(sp) || sp < 0) {
        ctx.addIssue({
          path: ["specialPrice"],
          code: z.ZodIssueCode.custom,
          message: "Special price must be a valid non-negative number",
        });
      } else if (sp > Number(v.mrp)) {
        ctx.addIssue({
          path: ["specialPrice"],
          code: z.ZodIssueCode.custom,
          message: "Special price must be ≤ MRP",
        });
      }
    }
  });

const normalizeImage = (img) => ({
  _id: String(img._id),
  alt: img.alt ?? "",
  path: String(img.path),
});

async function recomputeProductsStock(productIds) {
  const ids = Array.from(
    new Set(
      (productIds || [])
        .filter((id) => id && isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id))
    )
  );
  if (!ids.length) return {};

  const sums = await ProductVariant.aggregate([
    { $match: { product: { $in: ids }, deletedAt: null } },
    { $group: { _id: "$product", total: { $sum: "$stock" }, count: { $sum: 1 } } },
  ]);

  const m = new Map(sums.map((s) => [String(s._id), { total: s.total || 0, count: s.count || 0 }]));
  const bulk = [];
  const result = {};

  for (const oid of ids) {
    const key = String(oid);
    const rec = m.get(key);
    if (rec && rec.count > 0) {
      bulk.push({
        updateOne: {
          filter: { _id: oid },
          update: { $set: { hasVariants: true, stock: rec.total } },
        },
      });
      result[key] = { hasVariants: true, stock: rec.total };
    } else {
      bulk.push({
        updateOne: {
          filter: { _id: oid },
          update: { $set: { hasVariants: false, stock: 0 } },
        },
      });
      result[key] = { hasVariants: false, stock: 0 };
    }
  }

  if (bulk.length) await Product.bulkWrite(bulk, { ordered: false });
  return result;
}

export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();
    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const {
      _id,
      product,
      variantName,
      mrp,
      specialPrice,
      stock,
      productGallery,
      swatchImage,
      sku,
    } = parsed.data;

    const variant = await ProductVariant.findOne({ _id, deletedAt: null });
    if (!variant) return response(false, 404, "Variant not found");

    const oldProductId = String(variant.product);

    // if product changed, ensure new parent exists
    if (String(product) !== oldProductId) {
      const productExists = await Product.findOne({ _id: product, deletedAt: null }).lean();
      if (!productExists) return response(false, 404, "Parent product not found");
      variant.product = product;
    }

    // enforce unique SKU (excluding current)
    const newSku = sku.toUpperCase().trim();
    const skuClash = await ProductVariant.findOne({ _id: { $ne: _id }, sku: newSku }).lean();
    if (skuClash) return response(false, 409, "Another variant with this SKU already exists");

    // update fields
    variant.variantName = variantName.trim();
    variant.mrp = Number(mrp);
    variant.specialPrice =
      specialPrice == null || specialPrice === "" ? undefined : Number(specialPrice);
    variant.stock = Number(stock);
    variant.productGallery = productGallery.map(normalizeImage);
    variant.swatchImage = swatchImage ? normalizeImage(swatchImage) : undefined;
    variant.sku = newSku;

    await variant.save();

    // Recompute stock for affected products (old and new if changed)
    const affected = Array.from(new Set([oldProductId, String(variant.product)]));
    const productAdjustments = await recomputeProductsStock(affected);

    return response(true, 200, "Variant updated successfully", {
      variant,
      productAdjustments, // { productId: { hasVariants, stock } }
    });
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
