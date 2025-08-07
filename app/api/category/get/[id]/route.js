import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Category from "@/models/Category.model";
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth) {
      return response(false, 403, "unauthorized");
    }

    await connectDB();
    const getParams = await params;
    const id = getParams.id;

    if (!isValidObjectId(id)) {
      return response(false, 400, "Invalid category ID");
    }

    const category = await Category.findOne({
      _id: id,
      deletedAt: null,
    }).lean();

    if (!category) {
      return response(false, 404, "Category not found");
    }

    return response(true, 200, "Category found", category);
  } catch (error) {
    return catchError(error);
  }
}
