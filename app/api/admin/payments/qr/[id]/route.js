import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import QROrderPayment from "@/models/QrOrderPayment.model";
import Order from "@/models/Orders.model";

export async function POST(req) {
  try {
    await connectDB();

    // authz checks here (admin only) ...

    const body = await req.json();
    const { payment_id, action, note } = body || {};

    if (!payment_id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    const p = await QROrderPayment.findById(payment_id);
    if (!p) return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });

    if (action === "approve") {
      p.status = "approved";
      p.reviewNote = note || "";
      p.reviewedAt = new Date();
      await p.save();

      // Move order -> processing, mark paid
      await Order.updateOne(
        { _id: p.order },
        {
          $set: {
            status: "processing",
            "payment.status": "paid",
            "payment.provider": "qr",
            "payment.approvedPaymentId": p._id,
          },
        }
      );

      return NextResponse.json({ success: true, message: "Payment approved" });
    } else {
      p.status = "rejected";
      p.reviewNote = note || "";
      p.reviewedAt = new Date();
      await p.save();

      // Keep order in "payment not verified" (or set to a specific rejected state if you prefer)
      await Order.updateOne(
        { _id: p.order },
        {
          $set: {
            status: "payment not verified",
            "payment.status": "unverified",
            "payment.provider": "qr",
          },
        }
      );

      return NextResponse.json({ success: true, message: "Payment rejected" });
    }
  } catch (e) {
    return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
  }
}
