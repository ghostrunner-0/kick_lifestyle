// app/api/pathao/webhook/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Order from "@/models/Orders.model";
import Shipping from "@/models/Shipping.model";
import PathaoLedger from "@/models/PathaoLedger.model";

/** --------- Config --------- **/
const INBOUND_SIGNATURE_HEADER = "x-pathao-signature";
const REQUIRED_RETURN_HEADER = "X-Pathao-Merchant-Webhook-Integration-Secret";

// Must match Pathao’s docs exactly:
const PATHAO_RETURN_HEADER_SECRET =
  process.env.PATHAO_RETURN_HEADER_SECRET ||
  "f3992ecc-59da-4cbe-a049-a13da2018d51";

// Your shared secret Pathao will send back in X-PATHAO-Signature for real events
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
function withPathaoHeader(json, { status = 200 } = {}) {
  const res = NextResponse.json(json, { status });
  // exact header name/value required by Pathao:
  res.headers.set(REQUIRED_RETURN_HEADER, PATHAO_RETURN_HEADER_SECRET);
  return res;
}

const ack202 = (msg) => withPathaoHeader({ ok: true, received: msg }, { status: 202 });
const ack200 = (msg) => withPathaoHeader({ ok: true, received: msg }, { status: 200 });
const badRequest = (msg) => withPathaoHeader({ ok: false, error: msg }, { status: 400 });
const unauthorized = (msg) => withPathaoHeader({ ok: false, error: msg }, { status: 401 });

/** --------- Core Handler --------- **/
export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const event = String(payload?.event || "").toLowerCase().trim();

  // 1) Handshake (no signature check, MUST be 202 + header)
  if (event === "webhook_integration") {
    return ack202("webhook_integration");
  }

  // 2) Real events require signature check (plain compare per docs)
  const sig = req.headers.get(INBOUND_SIGNATURE_HEADER) || "";
  if (!WEBHOOK_SHARED_SECRET || sig !== WEBHOOK_SHARED_SECRET) {
    return unauthorized("Invalid signature");
  }

  // 3) Only attend events that provide merchant_order_id
  const displayOrderId = payload?.merchant_order_id || null;
  if (!displayOrderId) {
    // ack so Pathao doesn't retry
    return ack200("ignored_missing_merchant_order_id");
  }

  try {
    await dbConnect();

    // Common bits
    const consignmentId = payload?.consignment_id || null;
    const storeId = payload?.store_id || null;
    const deliveryFee = Number(payload?.delivery_fee ?? 0) || 0;
    const collectedAmount = Number(payload?.collected_amount ?? 0) || 0;
    const reason = payload?.reason || null;
    const updatedAt = payload?.updated_at || null;
    const timestamp = payload?.timestamp || null;

    const order = await Order.findOne({ display_order_id: displayOrderId }).lean();

    // --- order.created: attach tracking to Order & upsert Shipping (NO ledger)
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
      return ack200(event);
    }

    // --- order.updated: no ledger (we just ACK)
    if (event === "order.updated") {
      return ack200(event);
    }

    // --- order.delivered: mark completed (+ set COD paid), WRITE LEDGER
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
        currency: "NPR",
        deliveryFee,
        collectedAmount,
        netPayout: Math.max(0, collectedAmount - deliveryFee),
        invoiceId: null,
        reason: null,
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        raw: payload,
      });

      return ack200(event);
    }

    // --- order.returned: mark cancelled, WRITE LEDGER
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
        currency: "NPR",
        deliveryFee,
        collectedAmount: 0,
        netPayout: -deliveryFee,
        invoiceId: null,
        reason: reason || "returned",
        updatedAtRaw: updatedAt,
        timestampRaw: timestamp,
        raw: payload,
      });

      return ack200(event);
    }

    // --- order.delivery-failed: mark cancelled (NO ledger)
    if (event === "order.delivery-failed") {
      if (order) {
        const setOps = {
          status: "cancelled",
          "shipping.carrier": "pathao",
        };
        if (consignmentId) setOps["shipping.trackingId"] = consignmentId;
        await Order.updateOne({ _id: order._id }, { $set: setOps });
      }
      return ack200(event);
    }

    // --- order.paid, others: just ACK (NO ledger)
    if (event.startsWith("order.")) {
      return ack200(event);
    }

    // Non-order events: ACK
    return ack200(event || "unknown");
  } catch (err) {
    console.error("Pathao webhook error:", err);
    // ACK to avoid retries; you already checked signature.
    return withPathaoHeader({ ok: false, error: "internal_error" }, { status: 200 });
  }
}

export const dynamic = "force-dynamic";
