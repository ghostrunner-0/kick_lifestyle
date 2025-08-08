import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Product from "@/models/Product.model";

export async function GET(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    // Get all non-deleted products, newest first
    const products = await Product.find({ deletedAt: null })
      .select(
        "name slug shortDesc mrp specialPrice showInWebsite heroImage productMedia descImages category createdAt updatedAt"
      )
      .populate({ path: "category", select: "name slug" })
      .sort({ createdAt: -1 })
      .lean();

    // Flatten for export (CSV/XLS friendly)
    const exportRows = products.map((p) => ({
      name: p.name,
      slug: p.slug,
      categoryName: p.category?.name ?? null,
      categorySlug: p.category?.slug ?? null,
      shortDesc: p.shortDesc ?? "",
      mrp: p.mrp ?? null,
      specialPrice: p.specialPrice ?? null,
      showInWebsite: typeof p.showInWebsite === "boolean" ? p.showInWebsite : true,
      heroImagePath: p.heroImage?.path ?? null,
      heroImageAlt: p.heroImage?.alt ?? "",
      productMediaCount: Array.isArray(p.productMedia) ? p.productMedia.length : 0,
      descImagesCount: Array.isArray(p.descImages) ? p.descImages.length : 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return response(true, 200, "Products exported successfully", exportRows);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
