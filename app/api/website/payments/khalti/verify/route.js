// app/api/website/payments/khalti/verify/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";

export const dynamic = "force-dynamic";

const KHALTI_LOOKUP_URL =
  process.env.KHALTI_LOOKUP_URL || "https://a.khalti.com/api/v2/epayment/lookup/";
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || process.env.KHALTI_SECRET;

const mapKhaltiToOrderStatus = (s = "") => {
  switch (s) {
    case "Completed":
      return "processing";
    case "Pending":
    case "Initiated":
      return "pending payment";
    case "User canceled":
    case "Expired":
    case "Failed":
      return "cancelled";
    case "Refunded":
    case "Partially Refunded":
      return "cancelled";
    default:
      return "pending payment";
  }
};

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const pidx = String(body?.pidx || "").trim();
    const purchase_order_id = String(body?.purchase_order_id || "").trim();

    if (!pidx) return response(false, 400, "pidx is required");
    if (!KHALTI_SECRET_KEY) return response(false, 500, "Khalti secret key not configured");

    // 1) lookup
    const lookupRes = await fetch(KHALTI_LOOKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
      },
      body: JSON.stringify({ pidx }),
      cache: "no-store",
    });

    if (!lookupRes.ok) {
      const err = await lookupRes.text().catch(() => "");
      return response(false, 502, `Khalti lookup failed (${lookupRes.status}) ${err || ""}`.trim());
    }

    const lookup = await lookupRes.json();
    const { status: kStatus, total_amount, transaction_id } = lookup || {};

    // 2) find order (by saved pidx, or by purchase_order_id)
    let order =
      (await Order.findOne({ "metadata.khalti.pidx": pidx })) ||
      (purchase_order_id
        ? await Order.findOne({
            $or: [
              { display_order_id: purchase_order_id },
              mongoose.Types.ObjectId.isValid(purchase_order_id)
                ? { _id: purchase_order_id }
                : { _id: null },
            ],
          })
        : null);

    if (!order) return response(false, 404, "Order not found for this pidx");

    // 3) map status + amount check
    const next = mapKhaltiToOrderStatus(kStatus);
    const paidPaisa = Number(total_amount || 0);
    const orderPaisa = Math.round(Number(order?.amounts?.total || 0) * 100);

    let finalStatus = next;
    if (kStatus === "Completed" && paidPaisa !== orderPaisa) {
      finalStatus = "payment Not Verified";
    }

    // 4) save
    order.paymentMethod = "khalti";
    order.status = finalStatus;
    order.metadata = {
      ...(order.metadata || {}),
      khalti: {
        ...(order.metadata?.khalti || {}),
        pidx,
        status: kStatus,
        transaction_id: transaction_id || null,
        total_amount: paidPaisa,
        verifiedAt: new Date(),
      },
    };
    await order.save();

    const success = kStatus === "Completed" && finalStatus === "processing";
    return NextResponse.json({
      success,
      status: kStatus,
      message: success
        ? "Payment verified and order moved to processing."
        : `Payment status: ${kStatus}.`,
      order: { _id: order._id, display_order_id: order.display_order_id, status: order.status },
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
