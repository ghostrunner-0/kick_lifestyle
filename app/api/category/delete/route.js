import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Category from "@/models/Category.model";
import { NextResponse } from "next/server";

export async function DELETE(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const { ids, deleteType } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "Invalid IDs provided");
    }

    let result;
    let message;

    switch (deleteType) {
      case "SD": // Soft Delete - move to trash
        result = await Category.updateMany(
          { _id: { $in: ids } },
          { deletedAt: new Date() }
        );
        message = "Categories moved to trash successfully";
        break;

      case "PD": // Permanent Delete
        result = await Category.deleteMany({ _id: { $in: ids } });
        message = "Categories permanently deleted successfully";
        break;

      case "RSD": // Restore from trash
        result = await Category.updateMany(
          { _id: { $in: ids } },
          { deletedAt: null }
        );
        message = "Categories restored successfully";
        break;

      default:
        return response(false, 400, "Invalid delete type");
    }

    return response(true, 200, message, result);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
} 