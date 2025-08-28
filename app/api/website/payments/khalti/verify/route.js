export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";

const KHALTI_LOOKUP_URL =
  process.env.KHALTI_LOOKUP_URL || "https://a.khalti.com/api/v2/epayment/lookup/";
const KHALTI_SECRET_KEY =
  process.env.KHALTI_SECRET_KEY || process.env.KHALTI_SECRET;

const mapKhaltiToOrderStatus = (s = "") => {
  switch (s) {
    case "Completed":
      return "processing";
    // treat all “not successful yet” as pending payment
    case "Pending":
    case "Initiated":
      return "pending payment";
    // explicit failures go to cancelled
    case "User canceled":
    case "Expired":
    case "Failed":
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
    if (!KHALTI_SECRET_KEY)
      return response(false, 500, "Khalti secret key not configured");

    // 1) Lookup on Khalti
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
      return response(
        false,
        502,
        `Khalti lookup failed (${lookupRes.status}) ${err || ""}`.trim()
      );
    }

    const lookup = await lookupRes.json();
    const { status: kStatus, total_amount, transaction_id } = lookup || {};

    // 2) Find order (by pidx first; fallback to purchase_order_id)
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

    // 3) Status & amount checks
    const nextOrderStatus = mapKhaltiToOrderStatus(kStatus);
    const paidPaisa = Number(total_amount || 0);
    const orderPaisa = Math.round(Number(order?.amounts?.total || 0) * 100);

    const amountMatches = kStatus === "Completed" && paidPaisa === orderPaisa;

    // Decide final order + payment statuses
    let finalOrderStatus = nextOrderStatus;
    let paymentStatus = "unpaid";

    if (kStatus === "Completed") {
      if (amountMatches) {
        finalOrderStatus = "processing";
        paymentStatus = "paid";
      } else {
        finalOrderStatus = "payment Not Verified";
        paymentStatus = "unpaid";
      }
    } else if (nextOrderStatus === "pending payment") {
      paymentStatus = "unpaid";
    } else if (nextOrderStatus === "cancelled") {
      paymentStatus = "unpaid";
    }

    // 4) Persist
    order.paymentMethod = "khalti";
    order.status = finalOrderStatus;
    order.payment = {
      ...(order.payment || {}),
      status: paymentStatus,
      provider: "khalti",
      providerRef: transaction_id || order?.payment?.providerRef || null,
    };
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

    const success = paymentStatus === "paid" && finalOrderStatus === "processing";
    return NextResponse.json({
      success,
      status: kStatus,
      order: {
        _id: order._id,
        display_order_id: order.display_order_id,
        status: order.status,
        payment: { status: order.payment.status },
      },
      message: success
        ? "Payment verified — order is processing and marked paid."
        : `Payment status: ${kStatus}.`,
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
