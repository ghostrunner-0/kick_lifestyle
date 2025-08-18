import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import ProductVariant from "@/models/ProductVariant.model";
import Product from "@/models/Product.model";
import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const imageObject = z.object({
  _id: z.string().min(1),
  alt: z.string().optional(),
  path: z.string().min(1),
});

const createSchema = z
  .object({
    product: objectId,
    variantName: z.string().trim().min(1),
    mrp: z.coerce.number().positive(),
    // specialPrice is optional; if provided, validate later against mrp
    specialPrice: z.union([z.string(), z.number()]).optional(),
    stock: z.coerce.number().int().min(0, "Stock must be an integer ≥ 0"), // ✅ required
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

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();
    const parsed = createSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const data = parsed.data;

    // Ensure parent product exists and is not soft-deleted
    const parent = await Product.findOne({ _id: data.product, deletedAt: null }).lean();
    if (!parent) return response(false, 404, "Parent product not found");

    // Enforce unique SKU (case-insensitive)
    const sku = data.sku.toUpperCase().trim();
    const skuExists = await ProductVariant.findOne({ sku }).lean();
    if (skuExists) return response(false, 409, "A variant with this SKU already exists");

    // Create variant
    const created = await ProductVariant.create({
      product: data.product,
      variantName: data.variantName.trim(),
      mrp: Number(data.mrp),
      specialPrice:
        data.specialPrice == null || data.specialPrice === ""
          ? undefined
          : Number(data.specialPrice),
      stock: Number(data.stock),
      productGallery: data.productGallery.map(normalizeImage),
      swatchImage: data.swatchImage ? normalizeImage(data.swatchImage) : undefined,
      sku,
    });

    // ✅ Recompute and update parent product's total stock (sum of active variants)
    const sums = await ProductVariant.aggregate([
      { $match: { product: created.product, deletedAt: null } },
      { $group: { _id: "$product", total: { $sum: "$stock" } } },
    ]);

    const totalStock = sums?.[0]?.total ?? 0;

    await Product.findByIdAndUpdate(
      created.product,
      {
        $set: {
          hasVariants: true,   // mark product as variant-based
          stock: totalStock,   // keep product stock in sync with variants
        },
      },
      { new: true }
    ).lean();

    return response(true, 201, "Variant created successfully", {
      variant: created,
      productStock: totalStock,
    });
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
