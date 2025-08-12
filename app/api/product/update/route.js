import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema } from "@/lib/zodSchema";
import Product from "@/models/Product.model";
import { z } from "zod";
export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    const formSchema = zSchema
      .pick({
        _id: true,
        name: true,
        slug: true,
        shortDesc: true,
        category: true,
        mrp: true,
        specialPrice: true,
        productMedia: true,
        descImages: true,
        heroImage: true,
        additionalInfo: true,
        showInWebsite: true,
        warrantyMonths: true,
      })
      .extend({
        modelNumber: z.string().min(1, "Model number is required"),
        warrantyMonths: z.number().min(0, "Warranty cannot be negative"),
      });

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      return response(
        false,
        400,
        "Invalid or missing fields",
        parsed.error.format()
      );
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
      warrantyMonths,
      modelNumber,
    } = parsed.data;

    // ✅ Check if product exists
    const product = await Product.findOne({ _id, deletedAt: null });
    if (!product) {
      return response(false, 404, "Product not found");
    }

    // ✅ Check duplicate slug
    const slugClash = await Product.findOne({
      _id: { $ne: _id },
      slug,
      deletedAt: null,
    }).lean();
    if (slugClash) {
      return response(
        false,
        409,
        "Another product with this slug already exists"
      );
    }

    // ✅ Check duplicate model number
    const modelClash = await Product.findOne({
      _id: { $ne: _id },
      modelNumber: modelNumber.trim(),
      deletedAt: null,
    }).lean();
    if (modelClash) {
      return response(
        false,
        409,
        "Another product with this model number already exists"
      );
    }

    const normalizeImage = (img) => ({
      _id: String(img._id),
      alt: img.alt ?? "",
      path: String(img.path),
    });

    // ✅ Update fields
    product.name = name.trim();
    product.slug = slug.trim();
    product.shortDesc = shortDesc?.trim() || "";
    product.category = category;
    product.mrp = mrp;
    product.specialPrice = specialPrice ?? undefined;
    product.heroImage = normalizeImage(heroImage);
    product.productMedia = (productMedia || []).map(normalizeImage);
    product.descImages = (descImages || []).map(normalizeImage);
    product.additionalInfo = (additionalInfo || []).map((row) => ({
      label: row.label.trim(),
      value: row.value.trim(),
    }));
    product.showInWebsite =
      typeof showInWebsite === "boolean"
        ? showInWebsite
        : product.showInWebsite;
    product.warrantyMonths =
      typeof warrantyMonths === "number"
        ? warrantyMonths
        : product.warrantyMonths;
    product.modelNumber = modelNumber.trim();

    await product.save();

    return response(true, 200, "Product updated successfully", product);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
