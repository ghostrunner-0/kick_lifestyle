import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import Category from "@/models/Category.model";
import {z} from 'zod'

export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Extend validation schema to include showInWebsite boolean (optional)
    const formSchema = zSchema
      .pick({
        _id: true,
        name: true,
        slug: true,
        image: true,
      })
      .extend({
        showInWebsite: z.boolean().optional(),
      });

    const validate = formSchema.safeParse(payload);
    if (!validate.success) {
      return response(
        false,
        400,
        "Invalid or missing fields",
        validate.error.format()
      );
    }

    const { _id, name, slug, image, showInWebsite } = validate.data;

    const category = await Category.findOne({ _id, deletedAt: null });
    if (!category) {
      return response(false, 404, "Category not found");
    }

    category.name = name;
    category.slug = slug;
    category.image = image;

      category.showOnWebsite = showInWebsite;

console.log('showInWebsite (after parse):', showInWebsite, typeof showInWebsite);

    await category.save();

    return response(true, 200, "Category updated successfully", category);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
