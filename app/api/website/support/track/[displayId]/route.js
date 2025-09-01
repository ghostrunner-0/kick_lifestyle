export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";
import Shipping from "@/models/Shipping.model";

/* --------------------------- Helpers --------------------------- */
const normalizePhone = (v) =>
  String(v || "")
    .replace(/[^\d]/g, "")
    .replace(/^0+/, "")
    .slice(-10); // last 10 digits

const isTenDigits = (v) => /^\d{10}$/.test(v);

const buildPathaoTrackUrl = (consignmentId, phone) => {
  if (!consignmentId || !phone) return null;
  const qs = new URLSearchParams({
    consignment_id: String(consignmentId),
    phone: String(phone),
  });
  return `https://parcel.pathao.com/tracking?${qs.toString()}`;
};

const maskPhone = (p) => String(p || "").replace(/^(\d{6})/, "******");

const toPublicOrder = (order, tracking, khaltiPayment) => ({
  displayOrderId: order.display_order_id,
  placedAt: order.createdAt,
  status: order.status,
  payment: {
    method: order.paymentMethod,
    status: order?.payment?.status || "unpaid",
  },
  amounts: order.amounts || null,
  customer: {
    fullName: order?.customer?.fullName || null,
    phoneMasked: order?.customer?.phone ? maskPhone(order.customer.phone) : null,
  },
  shipping: {
    carrier: order?.shipping?.carrier || "pathao",
    trackingId: order?.shipping?.trackingId || null,
    tracking, // { carrier, number, url } | null
    address: order?.address
      ? {
          city: order.address.cityLabel || null,
          zone: order.address.zoneLabel || null,
          area: order.address.areaLabel || null,
          landmark: order.address.landmark || null,
        }
      : null,
  },
  items: Array.isArray(order.items)
    ? order.items.map((it) => ({
        name: it.name,
        variantName: it.variantName || null,
        qty: it.qty,
        price: it.price,
        mrp: it.mrp || 0,
        image: it.image || null,
      }))
    : [],
  khaltiPayment, // { available, payment_url?, pidx?, expires_at?, status? }
});

/* ------------------------------ GET --------------------------- */
/**
 * GET /api/website/support/track/[displayId]?phone=98XXXXXXXX
 */
export async function GET(req, { params }) {
  try {
    const url = new URL(req.url);
    const phone = normalizePhone(url.searchParams.get("phone"));
    const p = await params;
    const displayId = String(p?.displayId || p?.id || "").trim();

    if (!displayId) return response(false, 400, "Missing order id");
    if (!phone || !isTenDigits(phone)) return response(false, 400, "Enter a valid 10-digit phone");

    await connectDB();

    const order = await Order.findOne({ display_order_id: displayId }).lean();
    if (!order) return response(false, 404, "Order not found");

    // Anti-enumeration: phone must match order (or shipping doc as fallback)
    const orderPhone = normalizePhone(order?.customer?.phone);
    let phoneMatches = orderPhone && orderPhone === phone;

    // Get Shipping doc (needed for fallback phone + consignment)
    let shippingDoc = await Shipping.findOne({ order_display_id: displayId }).lean().catch(() => null);

    if (!phoneMatches) {
      const shippingPhone = normalizePhone(shippingDoc?.phoneNumber);
      phoneMatches = !!(shippingPhone && shippingPhone === phone);
    }

    if (!phoneMatches) return response(false, 403, "Order & phone do not match");

    // Build tracking (prefer Shipping phone for Pathao URL)
    const consignmentId = shippingDoc?.consignmentId || order?.shipping?.trackingId || null;
    const carrier = (shippingDoc?.carrier || order?.shipping?.carrier || "pathao").toLowerCase();
    const urlPhone =
      (shippingDoc?.phoneNumber && String(shippingDoc.phoneNumber)) || phone;

    const tracking =
      consignmentId && urlPhone
        ? { carrier, number: consignmentId, url: buildPathaoTrackUrl(consignmentId, urlPhone) }
        : null;

    // Khalti unpaid info
    const isKhalti = String(order?.paymentMethod || "").toLowerCase() === "khalti";
    const isPaid = String(order?.payment?.status || "").toLowerCase() === "paid";
    const khaltiMeta = (order?.metadata && order.metadata.khalti) || {};
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

    const payload = toPublicOrder(order, tracking, khaltiPayment);
    return response(true, 200, "Order fetched", payload);
  } catch (err) {
    return catchError(err, "Something went wrong");
  }
}

/* ----------------------------- POST --------------------------- */
/**
 * POST /api/website/support/track/[displayId]
 * body: { phone: "98XXXXXXXX" }
 */
export async function POST(req, { params }) {
  try {
    const body = (await req.json().catch(() => ({}))) || {};
    const phone = normalizePhone(body.phone);
    const p = await params;
    const displayId = String(p?.displayId || p?.id || "").trim();

    if (!displayId) return response(false, 400, "Missing order id");
    if (!phone || !isTenDigits(phone)) return response(false, 400, "Enter a valid 10-digit phone");

    await connectDB();

    const order = await Order.findOne({ display_order_id: displayId }).lean();
    if (!order) return response(false, 404, "Order not found");

    const orderPhone = normalizePhone(order?.customer?.phone);
    let phoneMatches = orderPhone && orderPhone === phone;

    let shippingDoc = await Shipping.findOne({ order_display_id: displayId }).lean().catch(() => null);
    if (!phoneMatches) {
      const shippingPhone = normalizePhone(shippingDoc?.phoneNumber);
      phoneMatches = !!(shippingPhone && shippingPhone === phone);
    }

    if (!phoneMatches) return response(false, 403, "Order & phone do not match");

    const consignmentId = shippingDoc?.consignmentId || order?.shipping?.trackingId || null;
    const carrier = (shippingDoc?.carrier || order?.shipping?.carrier || "pathao").toLowerCase();
    const urlPhone =
      (shippingDoc?.phoneNumber && String(shippingDoc.phoneNumber)) || phone;

    const tracking =
      consignmentId && urlPhone
        ? { carrier, number: consignmentId, url: buildPathaoTrackUrl(consignmentId, urlPhone) }
        : null;

    const isKhalti = String(order?.paymentMethod || "").toLowerCase() === "khalti";
    const isPaid = String(order?.payment?.status || "").toLowerCase() === "paid";
    const khaltiMeta = (order?.metadata && order.metadata.khalti) || {};
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

    const payload = toPublicOrder(order, tracking, khaltiPayment);
    return response(true, 200, "Order fetched", payload);
  } catch (err) {
    return catchError(err, "Something went wrong");
  }
}
