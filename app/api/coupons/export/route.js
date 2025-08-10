import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Category from "@/models/Category.model";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();
    
    // Get all categories for export (not deleted)
    const categories = await Category.find({ deletedAt: null })
      .select('name slug createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    return response(true, 200, "Categories exported successfully", categories);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
} 