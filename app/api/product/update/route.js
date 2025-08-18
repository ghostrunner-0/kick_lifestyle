import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import Product from "@/models/Product.model";
import { z } from "zod";

export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Build server-side schema for Update:
    // - specialPrice optional
    // - hasVariants boolean
    // - stock required iff hasVariants = false (int ≥ 0)
    // - modelNumber required
    const basePick = zSchema.pick({
      _id: true,
      name: true,
      slug: true,
      shortDesc: true,
      category: true,
      mrp: true,
      productMedia: true,
      descImages: true,
      heroImage: true,
      additionalInfo: true,
      showInWebsite: true,
      // we'll override specialPrice/warrantyMonths below
    });

    const formSchema = basePick
      .extend({
        specialPrice: z.union([z.string(), z.number()]).optional(),
        warrantyMonths: z.union([z.string(), z.number()]).optional(),
        modelNumber: z.string().trim().min(1, "Model number is required"),
        hasVariants: z.boolean().default(false),
        stock: z.union([z.string(), z.number()]).optional(),
      })
      .superRefine((vals, ctx) => {
        // stock checks only when there are NO variants
        if (!vals.hasVariants) {
          const n = Number(vals.stock);
          if (
            vals.stock === undefined ||
            vals.stock === "" ||
            Number.isNaN(n) ||
            n < 0 ||
            !Number.isInteger(n)
          ) {
            ctx.addIssue({
              path: ["stock"],
              code: z.ZodIssueCode.custom,
              message: "Stock is required and must be an integer ≥ 0.",
            });
          }
        }
        // specialPrice checks (only if provided)
        if (vals.specialPrice !== undefined && vals.specialPrice !== "") {
          const sp = Number(vals.specialPrice);
          const mrp = Number(vals.mrp);
          if (Number.isNaN(sp) || sp < 0) {
            ctx.addIssue({
              path: ["specialPrice"],
              code: z.ZodIssueCode.custom,
              message: "Special price must be a valid non-negative number.",
            });
          } else if (!Number.isNaN(mrp) && sp > mrp) {
            ctx.addIssue({
              path: ["specialPrice"],
              code: z.ZodIssueCode.custom,
              message: "Special price cannot be greater than MRP.",
            });
          }
        }
      });

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const data = parsed.data;

    // Ensure product exists (ignore soft-deleted)
    const product = await Product.findOne({ _id: data._id, deletedAt: null });
    if (!product) return response(false, 404, "Product not found");

    // Duplicate slug (excluding current)
    const slugClash = await Product.findOne({
      _id: { $ne: data._id },
      slug: data.slug,
      deletedAt: null,
    }).lean();
    if (slugClash) return response(false, 409, "Another product with this slug already exists");

    // Duplicate model number (excluding current)
    const modelClash = await Product.findOne({
      _id: { $ne: data._id },
      modelNumber: data.modelNumber.trim(),
      deletedAt: null,
    }).lean();
    if (modelClash) {
      return response(false, 409, "Another product with this model number already exists");
    }

    const normalizeImage = (img) => ({
      _id: String(img._id),
      alt: img.alt ?? "",
      path: String(img.path),
    });

    // Coerce numbers
    const mrpNum = Number(data.mrp);
    const spNum =
      data.specialPrice == null || data.specialPrice === ""
        ? undefined
        : Number(data.specialPrice);
    const warrantyNum =
      data.warrantyMonths == null || data.warrantyMonths === ""
        ? 0
        : Math.max(0, Number(data.warrantyMonths));

    const hasVariants = !!data.hasVariants;
    const stockNum = hasVariants
      ? 0 // when variants exist, product stock is derived by variant sums
      : Number(data.stock === "" || data.stock == null ? 0 : data.stock);

    // Update fields
    product.name = String(data.name || "").trim();
    product.slug = String(data.slug || "").trim();
    product.shortDesc = (data.shortDesc || "").trim();
    product.category = data.category;
    product.mrp = mrpNum;
    product.specialPrice = spNum; // optional
    product.warrantyMonths = warrantyNum;
    product.modelNumber = data.modelNumber.trim();
    product.hasVariants = hasVariants; // ✅ new field
    product.stock = stockNum;          // ✅ new field

    product.heroImage = normalizeImage(data.heroImage);
    product.productMedia = (data.productMedia || []).map(normalizeImage);
    product.descImages = (data.descImages || []).map(normalizeImage);
    product.additionalInfo = (data.additionalInfo || []).map((row) => ({
      label: String(row.label || "").trim(),
      value: String(row.value || "").trim(),
    }));
    product.showInWebsite =
      typeof data.showInWebsite === "boolean" ? data.showInWebsite : product.showInWebsite;

    await product.save();

    return response(true, 200, "Product updated successfully", product);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
