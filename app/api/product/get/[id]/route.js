import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Product from "@/models/Product.model";
import "@/models/Category.model";
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth) {
      return response(false, 403, "unauthorized"); 
    }

    await connectDB();
    const param = await params;
    const id = param?.id;
    if (!isValidObjectId(id)) { 
      return response(false, 400, "Invalid product ID");
    }

    const product = await Product.findOne({
      _id: id,
      deletedAt: null,
    })
      .populate({ path: "category", select: "name slug" })
      .lean();

    if (!product) {
      return response(false, 404, "Product not found");
    }

    return response(true, 200, "Product found", product);
  } catch (error) {
    return catchError(error);
  }
}
