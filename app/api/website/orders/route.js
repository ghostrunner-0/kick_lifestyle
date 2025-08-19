export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";
import Counter from "@/models/Counter.model";

/** Keep prefixes consistent everywhere (Khalti route uses same map) */
const ORDER_PREFIX = Object.freeze({
  cod: "AXC",
  khalti: "BLQ",
  qr: "MNP",
  default: "ZQX",
});

/** Global atomic sequence (shared with Khalti route) */
async function getNextOrderSequence(session = undefined) {
  try {
    const doc = await Counter.findOneAndUpdate(
      { _id: "order_display_seq" },
      [
        {
          $set: {
            // first order = 2000
            seq: { $add: [{ $ifNull: ["$seq", 1999] }, 1] },
          },
        },
      ],
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
 * Creates orders for COD or QR.
 * - COD  -> status: "processing"
 * - QR   -> status: "payment not verified"
 * (Khalti must use /api/website/payments/khalti/initiate)
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
    if (pm === "khalti") {
      // Client must call the Khalti initiate endpoint instead
      return response(false, 400, "Use /api/website/payments/khalti/initiate for Khalti");
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
    const shippingCost = pm === "cod" ? Math.max(0, Number(payload?.amounts?.shippingCost ?? 0)) : 0;
    const codFee = pm === "cod" ? Math.max(0, Number(payload?.amounts?.codFee ?? 0)) : 0;

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
    const status = pm === "cod" ? "processing" : "payment Not Verified";

    // ---- Build document
    const userId = new mongoose.Types.ObjectId(userIdRaw);
    const docToCreate = {
      userId,
      customer: payload?.customer || {},
      address: payload?.address || {},
      items,
      amounts: {
        subtotal,
        discount,
        shippingCost,
        codFee,
        total,
      },
      coupon: payload?.coupon || undefined,
      paymentMethod: pm,
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
      },
    };

    // ---- Create order
    let order;
    try {
      order = await Order.create(docToCreate);
    } catch (err) {
      if (err?.code === 11000 && /display_order_id/.test(err?.message || "")) {
        return response(false, 500, "Could not allocate a unique order id, please retry");
      }
      throw err;
    }

    // Return a useful shape (includes total for QR proof step)
    return NextResponse.json({
      success: true,
      data: {
        _id: order._id,
        display_order_id: order.display_order_id,
        status: order.status,
        amounts: order.amounts, // <-- includes total
      },
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
