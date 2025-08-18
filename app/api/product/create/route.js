import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import { z } from "zod";
import Product from "@/models/Product.model";

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Server-side schema to match AddProduct form
    const basePick = zSchema.pick({
      name: true,
      slug: true,
      shortDesc: true,
      category: true,
      mrp: true,
      productMedia: true,
      descImages: true,
      heroImage: true,
      additionalInfo: true,
      warrantyMonths: true,
      showInWebsite: true,
      specialPrice: true, // we'll override to optional below
    });

    const formSchema = basePick
      .extend({
        modelNumber: z.string().trim().min(1, "Model number is required"),
        hasVariants: z.boolean().default(false),
        specialPrice: z.union([z.string(), z.number()]).optional(),
        stock: z.union([z.string(), z.number()]).optional(),
      })
      .superRefine((vals, ctx) => {
        // stock is required if no variants
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

    const normalizeImage = (img) => ({
      _id: String(img._id),
      alt: img.alt ?? "",
      path: String(img.path),
    });

    const mrpNum = Number(data.mrp);
    const spNum =
      data.specialPrice == null || data.specialPrice === ""
        ? undefined
        : Number(data.specialPrice);

    const warrantyNum =
      data.warrantyMonths == null || data.warrantyMonths === ""
        ? 0
        : Math.max(0, Number(data.warrantyMonths));

    // Handle stock based on hasVariants
    const hasVariants = !!data.hasVariants;
    const stockNum = hasVariants
      ? 0 // auto-summed from variants later
      : Number(data.stock === "" || data.stock == null ? 0 : data.stock);

    const productDoc = {
      name: data.name.trim(),
      slug: data.slug.trim(),
      modelNumber: data.modelNumber.trim(),
      shortDesc: data.shortDesc?.trim() || "",
      category: data.category, // Mongoose will cast string to ObjectId
      mrp: mrpNum,
      specialPrice: spNum,
      warrantyMonths: warrantyNum,
      hasVariants,      // ✅ new
      stock: stockNum,  // ✅ new
      heroImage: normalizeImage(data.heroImage),
      productMedia: (data.productMedia || []).map(normalizeImage),
      descImages: (data.descImages || []).map(normalizeImage),
      additionalInfo: (data.additionalInfo || []).map((row) => ({
        label: String(row.label || "").trim(),
        value: String(row.value || "").trim(),
      })),
      showInWebsite: typeof data.showInWebsite === "boolean" ? data.showInWebsite : true,
    };

    // Prevent duplicates (ignore soft-deleted)
    const existing = await Product.findOne({
      $or: [{ slug: productDoc.slug }, { modelNumber: productDoc.modelNumber }],
      deletedAt: null,
    }).lean();

    if (existing) {
      const clash = existing.slug === productDoc.slug ? "slug" : "model number";
      return response(false, 409, `A product with this ${clash} already exists`);
    }

    const created = await Product.create(productDoc);
    return response(true, 201, "Product created successfully", created);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
