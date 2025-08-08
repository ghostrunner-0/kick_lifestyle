import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import Product from "@/models/Product.model";

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Validate exactly what the AddProduct form sends
    const formSchema = zSchema.pick({
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
      showInWebsite: true, // ✅ include visibility flag
    });

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const data = parsed.data;

    // Normalize image arrays (ensure shape + default alt)
    const normalizeImage = (img) => ({
      _id: String(img._id),
      alt: img.alt ?? "",
      path: String(img.path),
    });

    const productDoc = {
      name: data.name.trim(),
      slug: data.slug.trim(),
      shortDesc: data.shortDesc?.trim() || "",
      category: data.category, // string ObjectId; Mongoose will cast
      mrp: data.mrp,
      specialPrice: data.specialPrice ?? undefined,
      heroImage: normalizeImage(data.heroImage),
      productMedia: (data.productMedia || []).map(normalizeImage),
      descImages: (data.descImages || []).map(normalizeImage),
      additionalInfo: (data.additionalInfo || []).map((row) => ({
        label: row.label.trim(),
        value: row.value.trim(),
      })),
      // ✅ default to true if omitted by client (extra safety)
      showInWebsite: typeof data.showInWebsite === "boolean" ? data.showInWebsite : true,
    };

    // Duplicate slug protection (ignore soft-deleted)
    const existing = await Product.findOne({ slug: productDoc.slug, deletedAt: null }).lean();
    if (existing) {
      return response(false, 409, "A product with this slug already exists");
    }

    const created = await Product.create(productDoc);
    return response(true, 201, "Product created successfully", created);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
