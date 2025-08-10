// /app/api/coupon/delete/route.js
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Coupon from "@/models/Coupon.model";
import mongoose from "mongoose";

export async function DELETE(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const { ids, deleteType } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "Invalid IDs provided");
    }

    // Optional: validate ObjectIds to avoid casting errors
    const invalid = ids.filter((id) => !mongoose.isValidObjectId(id));
    if (invalid.length) {
      return response(false, 400, `Invalid coupon IDs: ${invalid.join(", ")}`);
    }

    let result;
    let message;

    switch (deleteType) {
      case "SD": // Soft Delete - move to trash
        result = await Coupon.updateMany(
          { _id: { $in: ids } },
          { $set: { deletedAt: new Date() } }
        );
        message = "Coupons moved to trash successfully";
        break;

      case "PD": // Permanent Delete
        result = await Coupon.deleteMany({ _id: { $in: ids } });
        message = "Coupons permanently deleted successfully";
        break;

      case "RSD": // Restore from trash
        result = await Coupon.updateMany(
          { _id: { $in: ids } },
          { $set: { deletedAt: null } }
        );
        message = "Coupons restored successfully";
        break;

      default:
        return response(false, 400, "Invalid delete type");
    }

    return response(true, 200, message, result);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
