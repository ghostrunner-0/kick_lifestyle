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

    // Validate exactly what the AddProduct form sends + modelNumber
    const formSchema = zSchema
      .pick({
        name: true,
        slug: true,
        shortDesc: true,
        category: true,
        mrp: true,
        specialPrice: true,
        warrantyMonths: true,
        productMedia: true,
        descImages: true,
        heroImage: true,
        additionalInfo: true,
        showInWebsite: true,
      })
      .extend({
        modelNumber: z.string().trim().min(1, "Model number is required"),
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
    const spNum = data.specialPrice == null ? undefined : Number(data.specialPrice);
    const warrantyNum =
      data.warrantyMonths == null || data.warrantyMonths === ""
        ? 0
        : Math.max(0, Number(data.warrantyMonths));

    const productDoc = {
      name: data.name.trim(),
      slug: data.slug.trim(),
      modelNumber: data.modelNumber.trim(), // ✅ added
      shortDesc: data.shortDesc?.trim() || "",
      category: data.category, // string ObjectId; Mongoose will cast
      mrp: mrpNum,
      specialPrice: spNum,
      warrantyMonths: warrantyNum,
      heroImage: normalizeImage(data.heroImage),
      productMedia: (data.productMedia || []).map(normalizeImage),
      descImages: (data.descImages || []).map(normalizeImage),
      additionalInfo: (data.additionalInfo || []).map((row) => ({
        label: row.label.trim(),
        value: row.value.trim(),
      })),
      showInWebsite: typeof data.showInWebsite === "boolean" ? data.showInWebsite : true,
    };

    // Duplicate protection (ignore soft-deleted)
    const existing = await Product.findOne({
      $or: [{ slug: productDoc.slug }, { modelNumber: productDoc.modelNumber }],
      deletedAt: null,
    }).lean();

    if (existing) {
      const clash =
        existing.slug === productDoc.slug ? "slug" : "model number";
      return response(false, 409, `A product with this ${clash} already exists`);
    }

    const created = await Product.create(productDoc);
    return response(true, 201, "Product created successfully", created);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
