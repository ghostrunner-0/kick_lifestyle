import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import { response } from "@/lib/helperFunctions";
import QROrderPayment from "@/models/QrOrderPayment.model";
import Order from "@/models/Orders.model"; // ← ensure this path matches your project

export const dynamic = "force-dynamic";

export async function POST(_req, { params }) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return response(false, 401, "admin not authenticated");

    await connectDB();

    const id = (await params)?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid id");
    }

    const payment = await QROrderPayment.findById(id);
    if (!payment) return response(false, 404, "Payment not found");

    if (payment.status !== "pending") {
      return response(false, 400, `Cannot approve a '${payment.status}' payment`);
    }

    payment.status = "approved";
    payment.reviewedBy = admin._id || admin.id || undefined;
    payment.reviewedAt = new Date();
    await payment.save();

    // Move order to processing (tweak if your Order model uses different fields)
    if (payment.order && mongoose.Types.ObjectId.isValid(payment.order)) {
      try {
        await Order.findByIdAndUpdate(payment.order, {
          $set: { status: "processing" },
        });
      } catch {
        // swallow to avoid failing the approve flow if order update fails
      }
    }

    return response(true, 200, "Payment approved", { data: payment });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
