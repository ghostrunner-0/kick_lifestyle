// app/api/website/payments/khalti/initiate/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Order from "@/models/Orders.model";
import User from "@/models/User.model";
import Counter from "@/models/Counter.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

const ORDER_PREFIX = Object.freeze({
  cod: "AXC",
  khalti: "BLQ",
  qr: "MNP",
  default: "ZQX",
});

// Atomic seq start 2000
async function getNextOrderSequence() {
  try {
    const doc = await Counter.findOneAndUpdate(
      { _id: "order_display_seq" },
      [
        { $set: { seq: { $add: [ { $ifNull: ["$seq", 1999] }, 1 ] } } },
      ],
      { upsert: true, new: true }
    ).lean();
    return doc.seq;
  } catch {
    await Counter.updateOne(
      { _id: "order_display_seq" },
      { $setOnInsert: { seq: 1999 } },
      { upsert: true }
    );
    const doc = await Counter.findOneAndUpdate(
      { _id: "order_display_seq" },
      { $inc: { seq: 1 } },
      { new: true }
    ).lean();
    return doc.seq;
  }
}

// Basic pre-check (no decrement here)
async function assertStockAvailable(items = []) {
  for (const it of items) {
    const qty = Number(it.qty || 0);
    if (qty <= 0) throw new Error("Invalid quantity");
    if (it.variantId) {
      const v = await ProductVariant.findOne({ _id: it.variantId, deletedAt: null }).select("stock").lean();
      if (!v || (v.stock ?? 0) < qty) throw new Error("Variant out of stock");
    } else {
      const p = await Product.findOne({ _id: it.productId, deletedAt: null }).select("stock").lean();
      if (!p || (p.stock ?? 0) < qty) throw new Error("Product out of stock");
    }
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const { user, customer, address, items, amounts, paymentMethod, coupon, metadata, userUpdates } = body || {};
    if (!user?.id || !user?.email) {
      return NextResponse.json({ success: false, message: "Missing user id/email" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    }
    if (paymentMethod !== "khalti") {
      return NextResponse.json({ success: false, message: "Invalid payment method" }, { status: 400 });
    }

    // user doc (optional)
    let dbUser = null;
    if (user.id && /^[0-9a-fA-F]{24}$/.test(user.id)) {
      dbUser = await User.findById(user.id).lean();
    }
    if (!dbUser) {
      dbUser = await User.findOne({ email: user.email }).lean();
    }

    // Update user basics
    if (dbUser) {
      const updates = {};
      const maybe = (k, v) => (v !== undefined && v !== null && dbUser[k] !== v ? (updates[k] = v) : undefined);
      const src = {
        name: userUpdates?.name ?? user?.name,
        phone: userUpdates?.phone ?? customer?.phone,
        address: userUpdates?.address ?? address?.landmark,
        pathaoCityId: userUpdates?.pathaoCityId ?? address?.cityId,
        pathaoCityLabel: userUpdates?.pathaoCityLabel ?? address?.cityLabel,
        pathaoZoneId: userUpdates?.pathaoZoneId ?? address?.zoneId,
        pathaoZoneLabel: userUpdates?.pathaoZoneLabel ?? address?.zoneLabel,
        pathaoAreaId: userUpdates?.pathaoAreaId ?? address?.areaId,
        pathaoAreaLabel: userUpdates?.pathaoAreaLabel ?? address?.areaLabel,
      };
      Object.entries(src).forEach(([k, v]) => maybe(k, v));
      if (Object.keys(updates).length) {
        await User.updateOne({ _id: dbUser._id }, { $set: updates });
      }
    }

    // Check stock (no decrement yet)
    await assertStockAvailable(items);

    // Create pending order id
    const seq = await getNextOrderSequence();
    const prefix = ORDER_PREFIX.khalti || ORDER_PREFIX.default;
    const displayOrderId = `${prefix}-${seq}`;
    const total = Math.max(0, Number(amounts?.total || 0));
    const amountPaisa = Math.round(total * 100);

    // Create the order in "pending payment"
    const order = await Order.create({
      userId: user.id,
      userRef: dbUser?._id,
      user: { name: user.name, email: user.email },

      customer,
      address,
      items,
      amounts: { ...amounts, shippingCost: 0, codFee: 0, total },

      paymentMethod: "khalti",
      payment: { status: "unpaid", provider: "khalti" },

      shipping: { carrier: "pathao", pricePlanPayload: metadata?.pricePlan },
      coupon: coupon || undefined,
      status: "pending payment",

      display_order_id: displayOrderId,
      display_order_seq: seq,
      display_order_prefix: prefix,
    });

    // Call Khalti Initiate
    const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY; // <- set in .env
    const BASE = process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";
    const WEBSITE_URL = process.env.WEBSITE_URL || "http://localhost:3000";
    const RETURN_URL = `${WEBSITE_URL}/payments/khalti/return`;

    const payload = {
      return_url: RETURN_URL,
      website_url: WEBSITE_URL,
      amount: amountPaisa,
      purchase_order_id: displayOrderId,           // merchant unique
      purchase_order_name: `Order ${displayOrderId}`,
      customer_info: {
        name: customer?.fullName || user?.name || "Customer",
        email: user?.email,
        phone: customer?.phone,
      },
      // Optional nice-to-have details
      product_details: (items || []).map((it) => ({
        identity: String(it.variantId || it.productId),
        name: it.variantName ? `${it.name} — ${it.variantName}` : it.name,
        total_price: Math.round(Number(it.price || 0) * Number(it.qty || 0) * 100),
        quantity: Number(it.qty || 0),
        unit_price: Math.round(Number(it.price || 0) * 100),
      })),
      merchant_extra: order._id.toString(),        // echoed back; handy for lookup
      merchant_username: process.env.KHALTI_MERCHANT_USERNAME || undefined,
    };

    const res = await fetch(`${BASE}/epayment/initiate/`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json?.pidx || !json?.payment_url) {
      // clean up the order if init fails
      try { await Order.deleteOne({ _id: order._id }); } catch {}
      return NextResponse.json(
        { success: false, message: json?.detail || json?.message || "Khalti initiate failed", error: json },
        { status: 400 }
      );
    }

    // Save pidx on order
    await Order.updateOne(
      { _id: order._id },
      { $set: { "payment.pidx": json.pidx, "payment.expires_at": json.expires_at } }
    );

    return NextResponse.json({
      success: true,
      payment_url: json.payment_url,
      pidx: json.pidx,
      order_id: order._id,
      display_order_id: displayOrderId,
    });
  } catch (err) {
    console.error("KHALTI_INIT_ERROR →", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
