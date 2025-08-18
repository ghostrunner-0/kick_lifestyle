import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Product from "@/models/Product.model";
import "@/models/Category.model"; // ensure Category is registered
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "unauthorized");

    await connectDB();
    const param = await  params ;
    const { id } =param|| {};
    if (!isValidObjectId(id)) {
      return response(false, 400, "Invalid product ID");
    }

    const product = await Product.findById(id)
      .select(
        [
          "name",
          "slug",
          "shortDesc",
          "category",
          "modelNumber",
          "mrp",
          "specialPrice",
          "warrantyMonths",
          "showInWebsite",
          "hasVariants",   // ✅ include variants flag
          "stock",         // ✅ include total stock
          "heroImage",
          "productMedia",
          "descImages",
          "additionalInfo",
          "createdAt",
          "updatedAt",
          "deletedAt",
        ].join(" ")
      )
      .populate({
        path: "category",
        select: "_id name slug",
        model: "Category",
      })
      .lean();

    if (!product || product.deletedAt) {
      return response(false, 404, "Product not found");
    }

    return response(true, 200, "Product found", product);
  } catch (error) {
    return catchError(error);
  }
}
