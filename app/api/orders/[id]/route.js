export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";

export async function GET(req, { params }) {
  console.log("🟢 [order:GET] API HIT");

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email && !session?.user?.id) {
      console.warn("❌ [order:GET] No session");
      return response(false, 401, "Unauthorized");
    }

    await connectDB();
    console.log("✅ [order:GET] DB connected");

    const rawId = params?.id || "";
    const displayId = decodeURIComponent(rawId).trim();
    console.log("🔹 [order:GET] display_order_id:", displayId);

    if (!displayId) {
      return response(false, 400, "Missing order id");
    }

    // identify current user
    const userId = session.user.id || session.user._id || null;
    const email = session.user.email?.toLowerCase?.() || null;

    // find order belonging to this user
    const order = await Order.findOne({
      display_order_id: displayId,
      $or: [
        { userId: userId || "__nope__" },
        { "user.email": email || "__nope__" },
      ],
    })
      .select(
        "display_order_id display_order_seq display_order_prefix orderNumber " +
          "items amounts paymentMethod payment status coupon createdAt"
      )
      .lean();

    if (!order) {
      console.warn(
        "❌ [order:GET] Order not found or not owned by user:",
        displayId
      );
      return response(false, 404, "Order not found");
    }

    console.log(
      "✅ [order:GET] Found order:",
      order.display_order_id,
      "status:",
      order.status,
      "payment:",
      order.payment?.status
    );

    return response(true, 200, "Order fetched", order);
  } catch (err) {
    console.error("💥 [order:GET] Error:", err);
    return catchError(err);
  }
}
