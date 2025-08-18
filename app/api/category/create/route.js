import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import { z } from "zod";
import Category from "@/models/Category.model";

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Reuse your image shape; fallback if not present on zSchema
    const imageShape =
      zSchema.shape?.image ??
      z.object({
        _id: z.string(),
        alt: z.string().optional().default(""),
        path: z.string(),
      });

    // Accept both showInWebsite (legacy from form) and showOnWebsite (canonical/model)
    const formSchema = z.object({
      name: zSchema.shape.name,
      slug: zSchema.shape.slug,
      image: imageShape,
      banner: imageShape.optional().nullable(), // <-- NEW optional banner
      showInWebsite: z.boolean().optional(),
      showOnWebsite: z.boolean().optional(),
    });

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const { name, slug, image, banner, showInWebsite, showOnWebsite } = parsed.data;

    // Final visibility flag for the model
    const visible =
      typeof showOnWebsite === "boolean"
        ? showOnWebsite
        : typeof showInWebsite === "boolean"
        ? showInWebsite
        : true;

    const newCategory = new Category({
      name,
      slug,
      image,
      ...(banner ? { banner } : {}), // only include if provided
      showOnWebsite: visible,
    });

    await newCategory.save();

    return response(true, 200, "Category created successfully!", newCategory);
  } catch (error) {
    // Handle duplicate key nicely (unique name/slug)
    if (error?.code === 11000) {
      const fields = Object.keys(error.keyPattern || {}).join(", ") || "unique field";
      return response(false, 409, `Duplicate ${fields}. Please use a different value.`);
    }
    return catchError(error, "Something went wrong");
  }
}
