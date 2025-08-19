import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Category from "@/models/Category.model";
import Product from "@/models/Product.model";
import UserModel from "@/models/User.model";
import OrdersModel from "@/models/Orders.model";

export async function GET() {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const [category, product, customer, orders] = await Promise.all([
      Category.countDocuments({ deletedAt: null }),
      Product.countDocuments({ deletedAt: null }),
      // If you only want customers (not admins/shopkeepers), add role filter:
      UserModel.countDocuments({ deletedAt: null /*, role: "user" */ }),
      OrdersModel.countDocuments({ deletedAt: null }),
    ]);

    // ✅ send as one object
    return response(true, 200, "Dashboard Count", {
      category,
      product,
      customer,
      orders,
    });
  } catch (error) {
    console.error("Dashboard count error:", error);
    return response(false, 500, "Something went wrong");
  }
}
