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

const updateSchema = z
  .object({
    _id: objectId,
    product: objectId,
    variantName: z.string().trim().min(1),
    mrp: z.coerce.number().positive(),
    specialPrice: z.coerce.number().positive().optional(),
    productGallery: z.array(imageObject).min(1),
    swatchImage: imageObject.optional(),
    sku: z.string().trim().min(1),
  })
  .refine((v) => v.specialPrice == null || v.specialPrice <= v.mrp, {
    path: ["specialPrice"],
    message: "Special price must be ≤ MRP",
  });

const normalizeImage = (img) => ({
  _id: String(img._id),
  alt: img.alt ?? "",
  path: String(img.path),
});

export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();
    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success)
      return response(false, 400, "Invalid or missing fields", parsed.error.format());

    const { _id, product, variantName, mrp, specialPrice, productGallery, swatchImage, sku } =
      parsed.data;

    const variant = await ProductVariant.findOne({ _id, deletedAt: null });
    if (!variant) return response(false, 404, "Variant not found");

    if (String(product) !== String(variant.product)) {
      const productExists = await Product.findOne({ _id: product, deletedAt: null }).lean();
      if (!productExists) return response(false, 404, "Parent product not found");
      variant.product = product;
    }

    const newSku = sku.toUpperCase().trim();
    const skuClash = await ProductVariant.findOne({ _id: { $ne: _id }, sku: newSku }).lean();
    if (skuClash) return response(false, 409, "Another variant with this SKU already exists");

    variant.variantName = variantName.trim();
    variant.mrp = Number(mrp);
    variant.specialPrice = specialPrice ?? undefined;
    variant.productGallery = productGallery.map(normalizeImage);
    variant.swatchImage = swatchImage ? normalizeImage(swatchImage) : undefined;
    variant.sku = newSku;

    await variant.save();
    return response(true, 200, "Variant updated successfully", variant);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
