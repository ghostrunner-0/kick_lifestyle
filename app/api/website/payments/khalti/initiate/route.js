export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";

const KHALTI_INIT_URL =
  process.env.KHALTI_INIT_URL || "https://a.khalti.com/api/v2/epayment/initiate/";
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || process.env.KHALTI_SECRET;
const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:3000";

export async function POST(req) {
  try {
    await connectDB();

    if (!KHALTI_SECRET_KEY) {
      return response(false, 500, "Khalti secret key not configured");
    }

    const body = await req.json().catch(() => ({}));
    // Accept either display_order_id or _id
    const displayId = String(body?.display_order_id || body?.displayId || "").trim();
    const orderId = String(body?.order_id || body?._id || "").trim();

    if (!displayId && !orderId) {
      return response(false, 400, "display_order_id or order_id is required");
    }

    // Find existing order
    const order = displayId
      ? await Order.findOne({ display_order_id: displayId })
      : await Order.findById(orderId);

    if (!order) return response(false, 404, "Order not found");
    if (order.paymentMethod !== "khalti") {
      return response(false, 400, "Order is not a Khalti order");
    }

    // Only allow initiate while not paid
    if (order.payment?.status === "paid") {
      return response(true, 200, "Order already paid; no initiation needed", {
        payment_url: order?.metadata?.khalti?.payment_url || null,
        pidx: order?.metadata?.khalti?.pidx || null,
        order: { _id: order._id, display_order_id: order.display_order_id, status: order.status },
      });
    }

    const total = Number(order?.amounts?.total || 0);
    if (!Number.isFinite(total) || total <= 0) {
      return response(false, 400, "Invalid order amount");
    }

    const amountPaisa = Math.round(total * 100);
    const purchase_order_id = order.display_order_id;
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
        amount: amountPaisa,
        purchase_order_id,
        purchase_order_name,
      }),
      cache: "no-store",
    });

    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => "");
      return response(
        false,
        502,
        `Khalti initiate failed (${initRes.status}) ${errText || ""}`.trim()
      );
    }

    const initJson = await initRes.json();
    const { pidx, payment_url, expires_at } = initJson || {};
    if (!pidx || !payment_url) {
      return response(false, 502, "Khalti initiate did not return pidx/payment_url");
    }

    // Save pidx + payment_url to existing order
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
      payment_url,
      pidx,
      order: {
        _id: order._id,
        display_order_id: order.display_order_id,
        status: order.status, // expected "pending payment"
      },
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
