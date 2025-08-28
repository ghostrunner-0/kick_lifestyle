export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Order from "@/models/Orders.model";
import Shipping from "@/models/Shipping.model";

const buildPathaoTrackUrl = (consignmentId, phone) => {
  if (!consignmentId || !phone) return null;
  const qs = new URLSearchParams({ consignment_id: consignmentId, phone: String(phone) });
  return `https://parcel.pathao.com/tracking?${qs.toString()}`;
};

export async function GET(_req, { params }) {
  try {
    await connectDB();

    const p = await params;
    const displayId = (p?.displayId || p?.id || "").trim();
    if (!displayId) {
      return NextResponse.json({ success: false, message: "Missing order id" }, { status: 400 });
    }

    const order = await Order.findOne({ display_order_id: displayId }).lean();
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // ---- Shipping (Pathao consignment join)
    let shippingDoc = null;
    try {
      shippingDoc = await Shipping.findOne({ order_display_id: displayId }).lean();
    } catch {}

    const consignmentId = shippingDoc?.consignmentId || order?.shipping?.trackingId || null;
    const phone = shippingDoc?.phoneNumber || order?.customer?.phone || null;
    const carrier = shippingDoc?.carrier || order?.shipping?.carrier || "pathao";

    const tracking =
      consignmentId && phone
        ? { carrier, number: consignmentId, url: buildPathaoTrackUrl(consignmentId, phone) }
        : null;

    // ---- Khalti payment block for unpaid orders
    const isKhalti = String(order?.paymentMethod).toLowerCase() === "khalti";
    const isPaid = String(order?.payment?.status || "").toLowerCase() === "paid";
    const khaltiMeta = order?.metadata?.khalti || {};
    const khaltiPayment =
      isKhalti && !isPaid
        ? {
            available: true,
            payment_url: khaltiMeta.payment_url || null,
            pidx: khaltiMeta.pidx || null,
            expires_at: khaltiMeta.expires_at || null,
            status: order?.status || "pending payment",
          }
        : { available: false };

    const payload = {
      ...order,
      displayOrderId: order.display_order_id,
      tracking,
      khaltiPayment,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
