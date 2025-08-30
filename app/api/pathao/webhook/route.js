// app/api/pathao/webhook/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Order from "@/models/Order";
import Shipping from "@/models/Shipping";
import PathaoLedger from "@/models/PathaoLedger";

/** --------- Config --------- **/
const INBOUND_SIGNATURE_HEADER = "x-pathao-signature";
const REQUIRED_RETURN_HEADER = "X-Pathao-Merchant-Webhook-Integration-Secret";

// Pathao requires this exact value back in your response header:
const PATHAO_RETURN_HEADER_SECRET =
  process.env.PATHAO_RETURN_HEADER_SECRET ||
  "f3992ecc-59da-4cbe-a049-a13da2018d51";

// They send your shared secret in X-PATHAO-Signature (plain compare per docs)
const WEBHOOK_SHARED_SECRET = process.env.PATHAO_WEBHOOK_SECRET || "pwhk_2b8c0c3f6a1e47d890f79e1a01a3d5e2";

/** --------- DB connect (cached) --------- **/
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri =
      process.env.MONGODB_URI ||
      process.env.NEXT_PUBLIC_MONGODB_URI ||
      "mongodb://127.0.0.1:27017/yourdb";
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

/** --------- Helpers --------- **/
function withPathaoHeader(json, { status = 200 } = {}) {
  const res = NextResponse.json(json, { status });
  res.headers.set(REQUIRED_RETURN_HEADER, PATHAO_RETURN_HEADER_SECRET);
  return res;
}

function unauthorized(msg = "Invalid signature") {
  return withPathaoHeader({ ok: false, error: msg }, { status: 401 });
}

function badRequest(msg = "Bad request") {
  return withPathaoHeader({ ok: false, error: msg }, { status: 400 });
}

/** --------- Core Handler --------- **/
export async function POST(req) {
  const sig = req.headers.get(INBOUND_SIGNATURE_HEADER) || "";

  // Validate signature
  if (!WEBHOOK_SHARED_SECRET || sig !== WEBHOOK_SHARED_SECRET) {
    return unauthorized();
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const event = String(payload?.event || "")
    .toLowerCase()
    .trim();

  // Special ping: must return 202 per Pathao docs
  if (event === "webhook_integration") {
    return withPathaoHeader({ ok: true, received: event }, { status: 202 });
  }

  // NEW: Ignore anything that doesn't carry a merchant order id
  const displayOrderId = payload?.merchant_order_id || null;
  if (!displayOrderId) {
    // Ack quickly so Pathao doesn't retry, but do nothing else
    return withPathaoHeader({
      ok: true,
      ignored: true,
      reason: "missing_merchant_order_id",
      received: event || "unknown",
    });
  }

  try {
    await dbConnect();

    // Common payload bits
    const consignmentId = payload?.consignment_id || null;
    const storeId = payload?.store_id || null;
    const deliveryFee = Number(payload?.delivery_fee ?? 0) || 0;
    const collectedAmount = Number(payload?.collected_amount ?? 0) || 0;
    const invoiceId = payload?.invoice_id || null;
    const reason = payload?.reason || null;
    const updatedAt = payload?.updated_at || null;
    const timestamp = payload?.timestamp || null;

    const order = await Order.findOne({
      display_order_id: displayOrderId,
    }).lean();

    /** order.created → upsert Shipping, attach tracking to Order, ledger */
    if (event === "order.created") {
      const phoneNumber =
        order?.customer?.phone || order?.user?.phone || "unknown";

      await Shipping.findOneAndUpdate(
        { consignmentId: consignmentId || "__unknown__" },
        {
          $setOnInsert: {
            carrier: "pathao",
            consignmentId: consignmentId || "__unknown__",
            order_display_id: displayOrderId,
            date: new Date(),
            phoneNumber,
          },
        },
        { upsert: true, new: true }
      );

      if (order && consignmentId) {
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              "shipping.carrier": "pathao",
              "shipping.trackingId": consignmentId,
            },
          }
        );
      }

      await PathaoLedger.create({
        consignmentId,
        displayOrderId,
        event,
        storeId,
        deliveryFee,
        collectedAmount: 0,
        invoiceId: null,
        reason: null,
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        netPayout: 0,
      });
    }

    /** order.updated → ledger trail */
    if (event === "order.updated") {
      await PathaoLedger.create({
        consignmentId,
        displayOrderId,
        event,
        storeId,
        deliveryFee,
        collectedAmount: 0,
        invoiceId: null,
        reason: null,
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        netPayout: 0,
      });
    }

    /** order.delivered → mark completed (+COD paid), ledger */
    if (event === "order.delivered") {
      if (order) {
        const setOps = {
          status: "completed",
          "shipping.carrier": "pathao",
        };
        if (consignmentId) setOps["shipping.trackingId"] = consignmentId;
        if (order.paymentMethod === "cod") setOps["payment.status"] = "paid";
        await Order.updateOne({ _id: order._id }, { $set: setOps });
      }

      await PathaoLedger.create({
        consignmentId,
        displayOrderId,
        event,
        storeId,
        deliveryFee,
        collectedAmount,
        invoiceId: null,
        reason: null,
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        netPayout: Math.max(0, collectedAmount - deliveryFee),
      });
    }

    /** order.returned → mark cancelled, ledger */
    if (event === "order.returned") {
      if (order) {
        const setOps = {
          status: "cancelled",
          "shipping.carrier": "pathao",
        };
        if (consignmentId) setOps["shipping.trackingId"] = consignmentId;
        await Order.updateOne({ _id: order._id }, { $set: setOps });
      }

      await PathaoLedger.create({
        consignmentId,
        displayOrderId,
        event,
        storeId,
        deliveryFee,
        collectedAmount: 0,
        invoiceId: null,
        reason: reason || "returned",
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        netPayout: -deliveryFee,
      });
    }

    /** order.delivery-failed → mark cancelled, ledger */
    if (event === "order.delivery-failed") {
      if (order) {
        const setOps = {
          status: "cancelled",
          "shipping.carrier": "pathao",
        };
        if (consignmentId) setOps["shipping.trackingId"] = consignmentId;
        await Order.updateOne({ _id: order._id }, { $set: setOps });
      }

      await PathaoLedger.create({
        consignmentId,
        displayOrderId,
        event,
        storeId,
        deliveryFee,
        collectedAmount: 0,
        invoiceId: null,
        reason: reason || "delivery_failed",
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        netPayout: -deliveryFee,
      });
    }

    /** order.paid (Payment Invoice) → ledger (invoice id captured) */
    if (event === "order.paid") {
      await PathaoLedger.create({
        consignmentId,
        displayOrderId,
        event,
        storeId,
        deliveryFee,
        collectedAmount: 0,
        invoiceId: invoiceId || null,
        reason: null,
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        netPayout: -deliveryFee,
      });
    }

    return withPathaoHeader({ ok: true, received: event || "unknown" });
  } catch (err) {
    console.error("Pathao webhook error:", err);
    // Ack to avoid retries; you've already signature-checked.
    return withPathaoHeader({ ok: false, error: "internal_error" });
  }
}

export const dynamic = "force-dynamic";
