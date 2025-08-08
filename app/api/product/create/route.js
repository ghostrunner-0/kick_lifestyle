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
      warrantyMonths: true,   // ✅ include warrantyMonths
      productMedia: true,     // array of {_id, alt, path}
      descImages: true,       // array of {_id, alt, path}
      heroImage: true,        // {_id, alt, path}
      additionalInfo: true,
      showInWebsite: true,    // visibility flag
    });

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const data = parsed.data;

    // helper: normalize image object
    const normalizeImage = (img) => ({
      _id: String(img._id),
      alt: img.alt ?? "",
      path: String(img.path),
    });

    // Coerce numbers safely (zod likely already coerced, this is belt & suspenders)
    const mrpNum = Number(data.mrp);
    const spNum = data.specialPrice == null ? undefined : Number(data.specialPrice);
    const warrantyNum =
      data.warrantyMonths == null || data.warrantyMonths === ""
        ? 0
        : Math.max(0, Number(data.warrantyMonths));

    const productDoc = {
      name: data.name.trim(),
      slug: data.slug.trim(),
      shortDesc: data.shortDesc?.trim() || "",
      category: data.category, // string ObjectId; Mongoose will cast
      mrp: mrpNum,
      specialPrice: spNum,
      warrantyMonths: warrantyNum, // ✅ saved to DB
      heroImage: normalizeImage(data.heroImage),
      productMedia: (data.productMedia || []).map(normalizeImage),
      descImages: (data.descImages || []).map(normalizeImage),
      additionalInfo: (data.additionalInfo || []).map((row) => ({
        label: row.label.trim(),
        value: row.value.trim(),
      })),
      showInWebsite:
        typeof data.showInWebsite === "boolean" ? data.showInWebsite : true,
    };

    // Duplicate slug protection (ignore soft-deleted)
    const existing = await Product.findOne({
      slug: productDoc.slug,
      deletedAt: null,
    }).lean();

    if (existing) {
      return response(false, 409, "A product with this slug already exists");
    }

    const created = await Product.create(productDoc);
    return response(true, 201, "Product created successfully", created);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
