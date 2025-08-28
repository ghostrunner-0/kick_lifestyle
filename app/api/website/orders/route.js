export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";
import Counter from "@/models/Counter.model";

/** Keep prefixes consistent everywhere */
const ORDER_PREFIX = Object.freeze({
  cod: "AXC",
  khalti: "MNP",
  qr: "BLQ",
  default: "ZQX",
});

/** Global atomic sequence */
async function getNextOrderSequence(session = undefined) {
  try {
    const doc = await Counter.findOneAndUpdate(
      { _id: "order_display_seq" },
      [{ $set: { seq: { $add: [{ $ifNull: ["$seq", 1999] }, 1] } } }],
      { new: true, upsert: true, session }
    ).lean();
    return doc.seq;
  } catch {
    await Counter.updateOne(
      { _id: "order_display_seq" },
      { $setOnInsert: { seq: 1999 } },
      { upsert: true, session }
    );
    const doc = await Counter.findOneAndUpdate(
      { _id: "order_display_seq" },
      { $inc: { seq: 1 } },
      { new: true, session }
    ).lean();
    return doc.seq;
  }
}

/**
 * POST /api/website/orders
 * Creates orders for COD, QR, and KHALTI (khalti initiation happens separately).
 */
export async function POST(req) {
  try {
    await connectDB();

    const payload = await req.json().catch(() => ({}));

    // ---- Basic validations
    const pm = String(payload?.paymentMethod || "").toLowerCase(); // "cod" | "qr" | "khalti"
    if (!["cod", "qr", "khalti"].includes(pm)) {
      return response(false, 400, "Invalid payment method");
    }

    const userIdRaw = payload?.user?.id || payload?.userId;
    if (!userIdRaw || !mongoose.isValidObjectId(userIdRaw)) {
      return response(false, 400, "Missing or invalid user id");
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length === 0) {
      return response(false, 400, "No items to place order");
    }

    // ---- Amounts
    const subtotal = Number(payload?.amounts?.subtotal ?? 0);
    const discount = Math.max(0, Number(payload?.amounts?.discount ?? 0));
    const shippingCost =
      pm === "cod"
        ? Math.max(0, Number(payload?.amounts?.shippingCost ?? 0))
        : 0;
    const codFee =
      pm === "cod" ? Math.max(0, Number(payload?.amounts?.codFee ?? 0)) : 0;

    const baseTotal = Math.max(0, subtotal - discount);
    const total = pm === "cod" ? baseTotal + shippingCost + codFee : baseTotal;

    if (!Number.isFinite(total) || total <= 0) {
      return response(false, 400, "Invalid order amount");
    }

    // ---- Allocate global display seq / id
    const seq = await getNextOrderSequence();
    const prefix = ORDER_PREFIX[pm] || ORDER_PREFIX.default;
    const display_order_id = `${prefix}-${seq}`;

    // ---- Status by payment method
    let status = "processing";
    if (pm === "qr") status = "payment Not Verified";
    if (pm === "khalti") status = "pending payment";

    // ---- Build document
    const userId = new mongoose.Types.ObjectId(userIdRaw);
    const docToCreate = {
      userId,
      user: {
        name: payload?.user?.name || undefined,
        email: payload?.user?.email || undefined,
      },
      customer: payload?.customer || {},
      address: payload?.address || {},
      items,
      amounts: {
        subtotal,
        discount,
        shippingCost,
        codFee,
        total,
        currency: payload?.amounts?.currency || "NPR",
      },
      coupon: payload?.coupon || undefined,
      paymentMethod: pm,
      // default payment status for khalti must be unpaid; others may remain unpaid too
      payment: {
        status:
          pm === "khalti" ? "unpaid" : payload?.payment?.status || "unpaid",
        provider:
          pm === "khalti" ? "khalti" : payload?.payment?.provider || undefined,
        providerRef: payload?.payment?.providerRef || undefined,
      },
      status,

      display_order_prefix: prefix,
      display_order_seq: seq,
      display_order_id,

      metadata: {
        ...(payload?.metadata || {}),
        pricePlan: payload?.metadata?.pricePlan || null,
        ...(pm === "qr"
          ? {
              qr: {
                expected_amount: total,
                submitted: false,
                createdAt: new Date(),
              },
            }
          : {}),
        ...(pm === "khalti"
          ? {
              khalti: {
                purchase_order_id: display_order_id,
                initiateAt: null, // filled after /initiate
                pidx: null,
                payment_url: null,
                status: "Created", // our internal flag
              },
            }
          : {}),
      },
    };

    // ---- Create order
    let order;
    try {
      order = await Order.create(docToCreate);
    } catch (err) {
      if (err?.code === 11000 && /display_order_id/.test(err?.message || "")) {
        return response(
          false,
          500,
          "Could not allocate a unique order id, please retry"
        );
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: order._id,
        display_order_id: order.display_order_id,
        status: order.status,
        payment: order.payment,
        amounts: order.amounts,
      },
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
