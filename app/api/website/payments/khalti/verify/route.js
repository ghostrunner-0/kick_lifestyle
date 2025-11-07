export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";

const KHALTI_LOOKUP_URL =
  process.env.KHALTI_LOOKUP_URL || "https://khalti.com/api/v2/epayment/lookup/";
const KHALTI_SECRET_KEY =
  process.env.KHALTI_SECRET_KEY || process.env.KHALTI_SECRET;

/* ------------------ Map Khalti statuses to order statuses ------------------ */
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
    case "Refunded":
    case "Partially Refunded":
      return "cancelled";
    default:
      return "pending payment";
  }
};

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

/* -------------------------------------------------------------------------- */
/*                                  HANDLER                                   */
/* -------------------------------------------------------------------------- */
export async function POST(req) {
  try {
    await connectDB();

    if (!KHALTI_SECRET_KEY)
      return response(false, 500, "Khalti secret key not configured");

    const body = await req.json().catch(() => ({}));
    const pidx = String(body?.pidx || "").trim();
    const purchase_order_id = String(body?.purchase_order_id || "").trim();

    if (!pidx) return response(false, 400, "pidx is required");

    /* ---------------------------- 1) Lookup Khalti ---------------------------- */
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
      const errText = await lookupRes.text().catch(() => "");
      return response(
        false,
        502,
        `Khalti lookup failed (${lookupRes.status}) ${errText || ""}`.trim()
      );
    }

    const lookup = await lookupRes.json();
    const kStatus = String(lookup?.status || "");
    const paidPaisa = Number(lookup?.total_amount || 0);
    const txnId = lookup?.transaction_id || null;
    const khaltiId = lookup?.mobile || null; // ✅ Khalti wallet ID (payer mobile)

    /* --------------------------- 2) Find the order --------------------------- */
    const findBy = [{ "payment.khalti.pidx": pidx }];
    if (purchase_order_id) {
      findBy.push({ display_order_id: purchase_order_id });
      if (isObjectId(purchase_order_id)) {
        findBy.push({ _id: new mongoose.Types.ObjectId(purchase_order_id) });
      }
    }

    // Fast path: if already paid, don’t downgrade
    const alreadyPaid = await Order.findOne({
      $or: findBy,
      "payment.status": "paid",
    })
      .select({ _id: 1, display_order_id: 1, status: 1, payment: 1 })
      .lean();

    if (alreadyPaid) {
      return NextResponse.json({
        success: true,
        status: "Completed",
        order: {
          _id: alreadyPaid._id,
          display_order_id: alreadyPaid.display_order_id,
          status: alreadyPaid.status,
          payment: { status: "paid" },
        },
        message: "Payment already verified.",
      });
    }

    // Otherwise fetch order to verify amount
    const order = await Order.findOne({ $or: findBy })
      .select({
        _id: 1,
        display_order_id: 1,
        "amounts.total": 1,
        status: 1,
        payment: 1,
      })
      .lean();

    if (!order) return response(false, 404, "Order not found for this pidx");

    const orderPaisa = Math.round(Number(order?.amounts?.total || 0) * 100);
    const amountMatches = kStatus === "Completed" && paidPaisa === orderPaisa;

    /* ----------------------- 3) Determine final statuses ---------------------- */
    const mappedOrderStatus = mapKhaltiToOrderStatus(kStatus);
    const finalOrderStatus =
      kStatus === "Completed"
        ? amountMatches
          ? "processing"
          : "payment Not Verified"
        : mappedOrderStatus;

    const paymentStatus =
      kStatus === "Completed" && amountMatches ? "paid" : "unpaid";

    /* ----------------------- 4) Update order atomically ----------------------- */
    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        "payment.status": { $ne: "paid" }, // prevent downgrade
      },
      {
        $set: {
          status: finalOrderStatus,
          paymentMethod: "khalti",
          "payment.status": paymentStatus,
          "payment.provider": "khalti",
          ...(txnId ? { "payment.providerRef": txnId } : {}),
          "payment.khalti.pidx": pidx,
          "payment.khalti.status": kStatus,
          "payment.khalti.transaction_id": txnId || null,
          "payment.khalti.total_amount": paidPaisa,
          "payment.khalti.khalti_id": khaltiId || null, // ✅ SAVE Khalti ID
          "payment.khalti.verifiedAt": new Date(),
        },
      },
      {
        new: true,
        projection: { _id: 1, display_order_id: 1, status: 1, payment: 1 },
      }
    ).lean();

    // fallback if race prevented update
    const finalDoc =
      updated ||
      (await Order.findById(order._id)
        .select({ _id: 1, display_order_id: 1, status: 1, payment: 1 })
        .lean());

    const success =
      finalDoc?.payment?.status === "paid" && finalDoc?.status === "processing";

    return NextResponse.json({
      success,
      status: kStatus,
      order: {
        _id: finalDoc._id,
        display_order_id: finalDoc.display_order_id,
        status: finalDoc.status,
        payment: finalDoc.payment,
      },
      message: success
        ? "Payment verified — order is processing and marked paid."
        : `Payment status: ${kStatus}.`,
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
