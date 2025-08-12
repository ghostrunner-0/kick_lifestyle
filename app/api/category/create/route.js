import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import Category from "@/models/Category.model";
import {z} from 'zod'

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Extend schema to include showInWebsite (optional, default true)
    const formSchema = zSchema
      .pick({
        name: true,
        slug: true,
        image: true,
      })
      .extend({
        showInWebsite: z.boolean().optional().default(true),
      });

    const validate = formSchema.safeParse(payload);
    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields", validate.error.format());
    }

    const { name, slug, image, showInWebsite } = validate.data;

    // Create and save the category with showInWebsite field
    const newCategory = new Category({
      name,
      slug,
      image,
      showInWebsite,
    });

    await newCategory.save();

    return response(true, 200, "Category created successfully!", newCategory);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
