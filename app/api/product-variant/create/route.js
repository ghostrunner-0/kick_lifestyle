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

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();
    const parsed = createSchema.safeParse(payload);
    if (!parsed.success)
      return response(false, 400, "Invalid or missing fields", parsed.error.format());

    const data = parsed.data;

    // Ensure product exists
    const productExists = await Product.findOne({ _id: data.product, deletedAt: null }).lean();
    if (!productExists) return response(false, 404, "Parent product not found");

    // Unique SKU
    const sku = data.sku.toUpperCase().trim();
    if (await ProductVariant.findOne({ sku }).lean())
      return response(false, 409, "A variant with this SKU already exists");

    const created = await ProductVariant.create({
      product: data.product,
      variantName: data.variantName.trim(),
      mrp: Number(data.mrp),
      specialPrice: data.specialPrice ?? undefined,
      productGallery: data.productGallery.map(normalizeImage),
      swatchImage: data.swatchImage ? normalizeImage(data.swatchImage) : undefined,
      sku,
    });

    return response(true, 201, "Variant created successfully", created);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
