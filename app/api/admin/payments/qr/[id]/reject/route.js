// app/api/admin/payments/qr/[id]/reject/route.js
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import { response } from "@/lib/helperFunctions";
import QROrderPayment from "@/models/QrOrderPayment.model";
import Order from "@/models/Orders.model"; // ← adjust path if different in your project

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
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
      return response(false, 400, `Cannot reject a '${payment.status}' payment`);
    }

    // Optional note from body
    let note = "";
    try {
      const body = await req.json();
      note = (body?.note || "").toString().slice(0, 500);
    } catch {
      /* no body provided */
    }

    payment.status = "rejected";
    payment.reviewedBy = admin._id || admin.id || undefined;
    payment.reviewedAt = new Date();
    if (note) payment.reviewNote = note;

    await payment.save();

    // 👉 ALSO update the related Order status to "Invalid Payment"
    if (payment.order && mongoose.Types.ObjectId.isValid(payment.order)) {
      try {
        await Order.findByIdAndUpdate(payment.order, {
          $set: { status: "Invalid Payment" },
        });
      } catch {
        // swallow error so rejection still succeeds
      }
    }

    return response(true, 200, "Payment rejected", { data: payment });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
