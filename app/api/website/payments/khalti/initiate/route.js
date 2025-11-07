// app/api/payments/khalti/initiate/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Order from "@/models/Orders.model";
import { response } from "@/lib/helperFunctions";

/* -------------------- ENV & constants -------------------- */
const RAW_BASE = process.env.KHALTI_BASE_URL || "https://khalti.com/api/v2/";
const KHALTI_BASE_URL = RAW_BASE.trim().endsWith("/")
  ? RAW_BASE.trim()
  : RAW_BASE.trim() + "/";

const INIT_URL = KHALTI_BASE_URL + "epayment/initiate/";
const SECRET_RAW = (
  process.env.KHALTI_SECRET_KEY ||
  process.env.KHALTI_SECRET ||
  ""
).trim();

const WEB_BASE_URL = (
  process.env.NEXTAUTH_URL ||
  process.env.WEBSITE_URL ||
  ""
).trim();

/* Sanity checks on boot */
function validateEnv() {
  const errs = [];
  if (!SECRET_RAW) errs.push("KHALTI_SECRET_KEY missing");
  if (!WEB_BASE_URL) errs.push("NEXTAUTH_URL/WEBSITE_URL missing");
  if (
    !/^https?:\/\//i.test(KHALTI_BASE_URL) ||
    (!KHALTI_BASE_URL.includes("khalti.com") &&
      !KHALTI_BASE_URL.includes("dev.khalti.com"))
  ) {
    errs.push(`KHALTI_BASE_URL invalid: ${KHALTI_BASE_URL}`);
  }
  if (errs.length) throw new Error("Khalti config error: " + errs.join("; "));
}

function maskKey(k) {
  if (!k) return "(empty)";
  if (k.length < 8) return k.replace(/./g, "*");
  return k.slice(0, 6) + "..." + k.slice(-4);
}

export async function POST(req) {
  try {
    validateEnv();
    await connectDB();

    const body = await req.json().catch(() => ({}));

    // Accept either display_order_id or _id
    const displayId = String(
      body?.display_order_id || body?.displayId || ""
    ).trim();
    const orderId = String(body?.order_id || body?._id || "").trim();

    if (!displayId && !orderId) {
      return response(false, 400, "display_order_id or order_id is required");
    }

    // Load order
    const order = displayId
      ? await Order.findOne({ display_order_id: displayId }).lean()
      : await Order.findById(orderId).lean();

    if (!order) return response(false, 404, "Order not found");
    if (order.paymentMethod !== "khalti") {
      return response(false, 400, "Order is not a Khalti order");
    }

    // Already paid?
    if (order.payment?.status === "paid") {
      return response(true, 200, "Order already paid", {
        order: {
          _id: order._id,
          display_order_id: order.display_order_id,
          status: order.status,
        },
        metadata: order.metadata?.khalti || null,
      });
    }

    const total = Number(order?.amounts?.total || 0);
    if (!Number.isFinite(total) || total <= 0) {
      return response(false, 400, "Invalid order amount");
    }

    const amountPaisa = Math.round(total * 100);
    const purchase_order_id = order.display_order_id;
    const purchase_order_name = `Order ${purchase_order_id}`;
    const return_url = `${WEB_BASE_URL.replace(
      /\/+$/,
      ""
    )}/payments/khalti/return`;

    // Optional but recommended
    const customer_info = {
      name:
        order?.customer?.fullName ||
        order?.customerName ||
        order?.user?.name ||
        "Customer",
      email: order?.user?.email || undefined,
      phone:
        (order?.customer?.phone || order?.customerPhone || "").trim() ||
        undefined,
    };

    // Build payload (only include customer_info if we have at least phone or email)
    const payload = {
      return_url,
      website_url: WEB_BASE_URL,
      amount: amountPaisa,
      purchase_order_id,
      purchase_order_name,
      ...(customer_info.phone || customer_info.email ? { customer_info } : {}),
      // You can also pass merchant_username / merchant_extra if you want:
      // merchant_username: process.env.KHALTI_MERCHANT_USERNAME || undefined,
      // merchant_extra: String(order._id),
    };

    const res = await fetch(INIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // EXACT format: "Key <token>"
        Authorization: `Key ${SECRET_RAW}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      // Helpful server-side log (masked key)
      console.error(
        "[KHALTI_INIT_FAIL]",
        res.status,
        INIT_URL,
        "KEY:",
        maskKey(SECRET_RAW),
        "RESP:",
        errText
      );
      // Return the raw text to help you see exact error from Khalti
      return response(
        false,
        502,
        `Khalti initiate failed (${res.status}) ${errText || ""}`.trim()
      );
    }

    const json = await res.json();
    const { pidx, payment_url, expires_at } = json || {};
    if (!pidx || !payment_url) {
      return response(
        false,
        502,
        "Khalti initiate did not return pidx/payment_url"
      );
    }

    // Save metadata (use $set since you’re using .lean() above)
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        "metadata.khalti.pidx": pidx,
        "metadata.khalti.payment_url": payment_url,
        "metadata.khalti.expires_at": expires_at || null,
        "metadata.khalti.initiateAt": new Date(),
        "metadata.khalti.status": "Initiated",
      },
    });

    return NextResponse.json({
      success: true,
      pidx,
      payment_url,
      order: {
        _id: order._id,
        display_order_id: order.display_order_id,
        status: order.status,
      },
    });
  } catch (e) {
    console.error("KHALTI_INIT_ERROR:", e);
    return response(false, 500, e?.message || "Server error");
  }
}
