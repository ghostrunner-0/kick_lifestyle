import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Category from "@/models/Category.model";
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth) return response(false, 403, "unauthorized");

    await connectDB();
    const param = await params;
    const id = param?.id;
    if (!id || !isValidObjectId(id)) {
      return response(false, 400, "Invalid category ID");
    }

    const doc = await Category.findOne({ _id: id, deletedAt: null })
      .select("-__v")
      .lean();

    if (!doc) return response(false, 404, "Category not found");

    // normalize fields for the admin forms
    const visible =
      typeof doc.showOnWebsite === "boolean"
        ? doc.showOnWebsite
        : typeof doc.showInWebsite === "boolean"
        ? doc.showInWebsite
        : true;

    const payload = {
      ...doc,
      banner: doc.banner ?? null,          // ensure key exists
      showOnWebsite: visible,              // canonical (matches model)
      showInWebsite: visible,              // alias for existing forms
    };

    return response(true, 200, "Category found", payload);
  } catch (error) {
    return catchError(error);
  }
}
