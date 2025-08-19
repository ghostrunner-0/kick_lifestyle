// app/api/website/payments/khalti/initiate/route.js
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";

export const dynamic = "force-dynamic";

const KHALTI_INIT_URL =
  process.env.KHALTI_INIT_URL || "https://a.khalti.com/api/v2/epayment/initiate/";
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || process.env.KHALTI_SECRET;
const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:3000";
const ORDER_PREFIX = process.env.ORDER_PREFIX || "MNP"; // e.g. "MNP"

// --- robust atomic seq generator in `counters` collection ---
// Bootstraps from the current max order seq if the counter doc does not exist yet.
// Robust atomic seq generator using a pipeline update (no $setOnInsert/$inc conflict)
async function getNextOrderSeq(prefix) {
  const countersCol = mongoose.connection.collection("counters");

  // Find current max seq among existing orders as a bootstrap for first insert
  let maxSeq = 0;
  try {
    const latest = await Order.findOne({ display_order_prefix: prefix })
      .sort({ display_order_seq: -1 })
      .select({ display_order_seq: 1, display_order_id: 1 })
      .lean();

    if (latest?.display_order_seq != null) {
      maxSeq = Number(latest.display_order_seq) || 0;
    } else if (latest?.display_order_id) {
      const tail = String(latest.display_order_id).split("-").pop();
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n)) maxSeq = n;
    }
  } catch {}

  // Pipeline update: seq = (seq || maxSeq) + 1
  const res = await countersCol.findOneAndUpdate(
    { _id: `order_${prefix}` },
    [
      {
        $set: {
          seq: { $add: [ { $ifNull: ["$seq", maxSeq] }, 1 ] },
        },
      },
    ],
    { upsert: true, returnDocument: "after" } // (returnOriginal: false for older drivers)
  );

  return res?.value?.seq || maxSeq + 1;
}


export async function POST(req) {
  try {
    await connectDB();

    if (!KHALTI_SECRET_KEY) {
      return response(false, 500, "Khalti secret key not configured");
    }

    const payload = await req.json();

    // --- validate minimal inputs ---
    const userIdRaw = payload?.user?.id || payload?.userId;
    if (!userIdRaw) return response(false, 400, "Missing user id");

    const total = Number(payload?.amounts?.total || 0);
    if (!Number.isFinite(total) || total <= 0) {
      return response(false, 400, "Invalid order amount");
    }

    // coerce to ObjectId if possible
    let userId = userIdRaw;
    if (mongoose.isValidObjectId(userIdRaw)) {
      userId = new mongoose.Types.ObjectId(userIdRaw);
    }

    // function to build a fresh order doc with a new seq
    const buildOrderDoc = async () => {
      const seq = await getNextOrderSeq(ORDER_PREFIX);
      const display_order_prefix = ORDER_PREFIX;
      const display_order_seq = seq;
      const display_order_id = `${ORDER_PREFIX}-${seq}`;

      const baseDoc = {
        ...payload,
        userId,
        paymentMethod: "khalti",
        status: "pending payment",
        display_order_prefix,
        display_order_seq,
        display_order_id,
        metadata: {
          ...(payload?.metadata || {}),
          khalti: {
            ...(payload?.metadata?.khalti || {}),
            purchase_order_id: display_order_id,
            initiateAt: new Date(),
          },
        },
      };
      return { baseDoc, display_order_id, display_order_seq };
    };

    // --- create order (retry once on duplicate just in case) ---
    let order;
    let purchase_order_id;
    let attempt = 0;
    while (attempt < 2) {
      const { baseDoc, display_order_id } = await buildOrderDoc();
      try {
        order = await Order.create(baseDoc);
        purchase_order_id = display_order_id;
        break; // success
      } catch (err) {
        if (err?.code === 11000 && /display_order_id/.test(err?.message || "")) {
          // duplicate — try again with a new seq
          attempt += 1;
          continue;
        }
        throw err; // other errors
      }
    }
    if (!order) {
      return response(false, 500, "Could not allocate a unique order id");
    }

    // --- call Khalti initiate ---
    const amountPaisa = Math.round(total * 100);
    const purchase_order_name = `Order ${purchase_order_id}`;
    const return_url = `${WEB_BASE_URL}/payments/khalti/return`;

    const initRes = await fetch(KHALTI_INIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
      },
      body: JSON.stringify({
        return_url,
        website_url: WEB_BASE_URL,
        amount: amountPaisa, // paisa
        purchase_order_id,
        purchase_order_name,
      }),
      cache: "no-store",
    });

    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => "");
      // rollback to avoid orphan pending order
      await Order.findByIdAndDelete(order._id);
      return response(
        false,
        502,
        `Khalti initiate failed (${initRes.status}) ${errText || ""}`.trim()
      );
    }

    const initJson = await initRes.json();
    const { pidx, payment_url, expires_at } = initJson || {};
    if (!pidx || !payment_url) {
      await Order.findByIdAndDelete(order._id);
      return response(false, 502, "Khalti initiate did not return pidx/payment_url");
    }

    // --- store pidx for later lookup/verify ---
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        "metadata.khalti.pidx": pidx,
        "metadata.khalti.payment_url": payment_url,
        "metadata.khalti.expires_at": expires_at || null,
      },
    });

    return NextResponse.json({
      success: true,
      payment_url,
      pidx,
      order: {
        _id: order._id,
        display_order_id: purchase_order_id,
        status: order.status,
      },
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
