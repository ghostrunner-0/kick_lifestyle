// app/api/website/payments/khalti/verify/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import mongoose from "mongoose";
import Order from "@/models/Orders.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

async function decVariantStock(session, variantId, qty) {
  const doc = await ProductVariant.findOneAndUpdate(
    { _id: variantId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { new: true, session }
  ).lean();
  if (!doc) throw new Error("Insufficient variant stock");
  // post('findOneAndUpdate') hook on model will recalc product stock
}

async function decProductStock(session, productId, qty) {
  const doc = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { new: true, session }
  ).lean();
  if (!doc) throw new Error("Insufficient product stock");
}

export async function POST(req) {
  try {
    await connectDB();
    const { pidx } = await req.json();

    if (!pidx) {
      return NextResponse.json({ success: false, message: "Missing pidx" }, { status: 400 });
    }

    const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
    const BASE = process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";

    // Lookup
    const res = await fetch(`${BASE}/epayment/lookup/`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    });
    const lj = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, message: lj?.detail || "Lookup failed", error: lj }, { status: 400 });
    }

    // Only Completed is success
    if (lj?.status !== "Completed") {
      return NextResponse.json({
        success: false,
        status: lj?.status,
        message: "Payment not completed",
      }, { status: 200 }); // not an error to client; just not-completed
    }

    // Find order by pidx
    const order = await Order.findOne({ "payment.pidx": pidx }).lean();
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found for pidx" }, { status: 404 });
    }

    // Amount sanity (paisa)
    const expected = Math.round(Number(order?.amounts?.total || 0) * 100);
    if (expected && Number(lj?.total_amount) !== expected) {
      return NextResponse.json({ success: false, message: "Amount mismatch" }, { status: 400 });
    }

    // If already paid, just return success
    if (order?.payment?.status === "paid") {
      return NextResponse.json({
        success: true,
        order: { display_order_id: order.display_order_id, _id: order._id },
      });
    }

    // Decrement stock atomically, mark paid
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // decrement per item
        for (const it of order.items || []) {
          const qty = Number(it.qty || 0);
          if (it.variantId) {
            await decVariantStock(session, it.variantId, qty);
          } else {
            await decProductStock(session, it.productId, qty);
          }
        }

        // mark paid
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              "payment.status": "paid",
              "payment.provider": "khalti",
              "payment.providerRef": lj?.transaction_id || lj?.tidx || null,
              status: "processing",
            },
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({
      success: true,
      order: { display_order_id: order.display_order_id, _id: order._id },
    });
  } catch (err) {
    console.error("KHALTI_VERIFY_ERROR →", err);
    return NextResponse.json({ success: false, message: err?.message || "Server error" }, { status: 500 });
  }
}
