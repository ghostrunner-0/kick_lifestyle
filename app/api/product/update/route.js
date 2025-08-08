import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import Product from "@/models/Product.model";

export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Validate only the fields we allow to update
    const formSchema = zSchema.pick({
      _id: true,
      name: true,
      slug: true,
      shortDesc: true,
      category: true,
      mrp: true,
      specialPrice: true,
      productMedia: true, // array of {_id, alt, path}
      descImages: true,   // array of {_id, alt, path}
      heroImage: true,    // {_id, alt, path}
      additionalInfo: true,
      showInWebsite: true,
    });

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const {
      _id,
      name,
      slug,
      shortDesc,
      category,
      mrp,
      specialPrice,
      productMedia,
      descImages,
      heroImage,
      additionalInfo,
      showInWebsite,
    } = parsed.data;

    // Ensure product exists (and not soft-deleted)
    const product = await Product.findOne({ _id, deletedAt: null });
    if (!product) {
      return response(false, 404, "Product not found");
    }

    // Optional: prevent duplicate slug with another product
    const slugClash = await Product.findOne({
      _id: { $ne: _id },
      slug,
      deletedAt: null,
    }).lean();

    if (slugClash) {
      return response(false, 409, "Another product with this slug already exists");
    }

    // Normalize image objects (defensive)
    const normalizeImage = (img) => ({
      _id: String(img._id),
      alt: img.alt ?? "",
      path: String(img.path),
    });

    product.name = name.trim();
    product.slug = slug.trim();
    product.shortDesc = shortDesc?.trim() || "";
    product.category = category; // Mongoose will cast ObjectId
    product.mrp = mrp;
    product.specialPrice = specialPrice ?? undefined;
    product.heroImage = normalizeImage(heroImage);
    product.productMedia = (productMedia || []).map(normalizeImage);
    product.descImages = (descImages || []).map(normalizeImage);
    product.additionalInfo = (additionalInfo || []).map((row) => ({
      label: row.label.trim(),
      value: row.value.trim(),
    }));
    product.showInWebsite = typeof showInWebsite === "boolean" ? showInWebsite : product.showInWebsite;

    await product.save();

    return response(true, 200, "Product updated successfully", product);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
