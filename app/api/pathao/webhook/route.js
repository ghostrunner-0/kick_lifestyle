// app/api/pathao/webhook/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Order from "@/models/Order";
import Shipping from "@/models/Shipping";
import PathaoLedger from "@/models/PathaoLedger";

/** --------- Config --------- **/
const INBOUND_SIGNATURE_HEADER = "x-pathao-signature";
const REQUIRED_RETURN_HEADER = "X-Pathao-Merchant-Webhook-Integration-Secret";

// MUST be exactly this for Pathao's handshake check:
const PATHAO_RETURN_HEADER_SECRET =
  process.env.PATHAO_RETURN_HEADER_SECRET ||
  "f3992ecc-59da-4cbe-a049-a13da2018d51";

// Pathao sends back the shared secret in X-PATHAO-Signature for real events
const WEBHOOK_SHARED_SECRET =
  process.env.PATHAO_WEBHOOK_SECRET || "pwhk_2b8c0c3f6a1e47d890f79e1a01a3d5e2";

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
function jsonWithHeader(json, { status = 200 } = {}) {
  const res = NextResponse.json(json, { status });
  // Header names are case-insensitive, but we set their exact-cased name anyway:
  res.headers.set(REQUIRED_RETURN_HEADER, PATHAO_RETURN_HEADER_SECRET);
  return res;
}
const ack202 = (msg) => jsonWithHeader({ ok: true, received: msg }, { status: 202 });
const ack200 = (msg) => jsonWithHeader({ ok: true, received: msg }, { status: 200 });
const badRequest = (msg) => jsonWithHeader({ ok: false, error: msg }, { status: 400 });
const unauthorized = (msg) => jsonWithHeader({ ok: false, error: msg }, { status: 401 });

/** --------- Core Handler --------- **/
export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const event = String(payload?.event || "").toLowerCase().trim();

  // 1) Handshake: must reply 202 + header, do NOT require signature here
  if (event === "webhook_integration") {
    return ack202("webhook_integration");
  }

  // 2) For real events, require the plain shared secret in the header
  const sig = req.headers.get(INBOUND_SIGNATURE_HEADER) || "";
  if (!WEBHOOK_SHARED_SECRET || sig !== WEBHOOK_SHARED_SECRET) {
    return unauthorized("Invalid signature");
  }

  // 3) Only attend events that carry merchant_order_id (your requirement)
  const displayOrderId = payload?.merchant_order_id || null;
  if (!displayOrderId) {
    return ack200("ignored_missing_merchant_order_id");
  }

  try {
    await dbConnect();

    const consignmentId = payload?.consignment_id || null;
    const storeId = payload?.store_id || null;
    const deliveryFee = Number(payload?.delivery_fee ?? 0) || 0;
    const collectedAmount = Number(payload?.collected_amount ?? 0) || 0;
    const invoiceId = payload?.invoice_id || null;
    const reason = payload?.reason || null;
    const updatedAt = payload?.updated_at || null;
    const timestamp = payload?.timestamp || null;

    const order = await Order.findOne({ display_order_id: displayOrderId }).lean();

    // --- order.created: upsert Shipping, attach tracking to Order, ledger
    if (event === "order.created") {
      const phoneNumber = order?.customer?.phone || order?.user?.phone || "unknown";

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

      return ack200(event);
    }

    // --- order.updated: ledger trail
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
      return ack200(event);
    }

    // --- order.delivered: mark completed (+COD paid), ledger
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

      return ack200(event);
    }

    // --- order.returned: mark cancelled, ledger
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

      return ack200(event);
    }

    // --- order.delivery-failed: mark cancelled, ledger
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

      return ack200(event);
    }

    // --- order.paid (Payment Invoice): ledger (capture invoice id)
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

      return ack200(event);
    }

    // Fallback: ACK unknown/other order.* events so Pathao doesn't retry
    if (event.startsWith("order.")) {
      await PathaoLedger.create({
        consignmentId,
        displayOrderId,
        event,
        storeId,
        deliveryFee,
        collectedAmount: Number(payload?.collected_amount ?? 0) || 0,
        invoiceId: invoiceId || null,
        reason: reason || null,
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        netPayout: 0,
      });
      return ack200(event);
    }

    // Non-order events: just ACK
    return ack200(event || "unknown");
  } catch (err) {
    console.error("Pathao webhook error:", err);
    // Still ACK to prevent excessive retries
    return jsonWithHeader({ ok: false, error: "internal_error" }, { status: 200 });
  }
}

export const dynamic = "force-dynamic";
