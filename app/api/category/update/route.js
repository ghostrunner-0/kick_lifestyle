import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import Category from "@/models/Category.model";
import { z } from "zod";

export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Keep track of whether 'banner' was explicitly sent (so we can clear it)
    const hasBannerKey = Object.prototype.hasOwnProperty.call(payload, "banner");

    // Reuse your image shape (fallback if not present on zSchema)
    const imageShape =
      zSchema.shape?.image ??
      z.object({
        _id: z.string(),
        alt: z.string().optional().default(""),
        path: z.string(),
      });

    // Accept both showInWebsite (form) and showOnWebsite (canonical/model)
    const formSchema = z.object({
      _id: zSchema.shape._id,
      name: zSchema.shape.name,
      slug: zSchema.shape.slug,
      image: imageShape,
      banner: imageShape.optional().nullable(), // optional & clearable
      showInWebsite: z.boolean().optional(),
      showOnWebsite: z.boolean().optional(),
    });

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const { _id, name, slug, image, banner, showInWebsite, showOnWebsite } = parsed.data;

    const category = await Category.findOne({ _id, deletedAt: null });
    if (!category) return response(false, 404, "Category not found");

    // Required fields
    category.name = name;
    category.slug = slug;
    category.image = image;

    // Visibility mapping: keep previous if not provided
    if (typeof showOnWebsite === "boolean") {
      category.showOnWebsite = showOnWebsite;
    } else if (typeof showInWebsite === "boolean") {
      category.showOnWebsite = showInWebsite;
    }

    // Banner: set/replace/clear only if the key was present in payload
    if (hasBannerKey) {
      category.banner = banner ?? null; // clear if null/undefined
    }

    await category.save();

    return response(true, 200, "Category updated successfully", category);
  } catch (error) {
    // Handle unique conflicts (name/slug)
    if (error?.code === 11000) {
      const fields = Object.keys(error.keyPattern || {}).join(", ") || "unique field";
      return response(false, 409, `Duplicate ${fields}. Please use a different value.`);
    }
    return catchError(error, "Something went wrong");
  }
}
