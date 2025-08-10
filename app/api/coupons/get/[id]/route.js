// /app/api/coupon/get/[id]/route.js
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Coupon from "@/models/Coupon.model";
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "unauthorized");

    await connectDB();

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return response(false, 400, "Invalid coupon ID");
    }

    const coupon = await Coupon.findOne({ _id: id, deletedAt: null }).lean();

    if (!coupon) {
      return response(false, 404, "Coupon not found");
    }

    return response(true, 200, "Coupon found", coupon);
  } catch (error) {
    return catchError(error);
  }
}
