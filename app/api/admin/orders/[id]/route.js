// app/api/admin/orders/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

/* ---- helpers ---- */
const json = (ok, status, payload) =>
  NextResponse.json(
    ok
      ? { success: true, data: payload }
      : { success: false, message: payload },
    { status }
  );

const ALLOWED_STATUSES = new Set([
  "processing",
  "pending payment",
  "payment Not Verified",
  "Invalid Payment",
  "ready to pack",
  "ready to ship",
  "completed",
  "cancelled",
]);

const ALLOWED_PAYMENTS = new Set(["cod", "khalti", "qr"]);
const trim = (v) => (typeof v === "string" ? v.trim() : v);
const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);
const toNum = (v, def = 0) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : def;
};

/* sanitize & compute amounts on server */
function sanitizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  const out = [];
  for (const it of arr) {
    const qty = Math.max(0, parseInt(it?.qty ?? 0, 10) || 0);
    const hasIdentity = !!(it?.name || it?.productId);
    if (!hasIdentity || qty <= 0) continue;

    const isFreeItem = !!it?.isFreeItem;
    const priceRaw = toNum(it?.price, 0);
    const price = isFreeItem ? 0 : Math.max(0, priceRaw);
    const mrp = Math.max(0, toNum(it?.mrp, price));

    out.push({
      productId: it?.productId || null,
      variantId: it?.variantId || null,
      name: trim(it?.name || ""),
      variantName: trim(it?.variantName || "") || null,
      qty,
      price,
      mrp,
      image: it?.image || undefined,
      isFreeItem,
    });
  }
  return out;
}

function computeAmounts({
  items,
  discount,
  paymentMethod,
  shippingCost,
  codFee,
}) {
  const subtotal = items.reduce(
    (sum, it) => sum + Math.max(0, it.price) * Math.max(0, it.qty),
    0
  );
  const safeDiscount = Math.max(0, Math.min(subtotal, toNum(discount, 0)));
  const isCOD = paymentMethod === "cod";
  const ship = isCOD ? Math.max(0, toNum(shippingCost, 0)) : 0;
  const fee = isCOD ? Math.max(0, toNum(codFee, 0)) : 0;
  const base = Math.max(0, subtotal - safeDiscount);
  const total = base + ship + fee;
  return {
    subtotal,
    discount: safeDiscount,
    shippingCost: ship,
    codFee: fee,
    total,
  };
}

/* -------------------- GET /api/admin/orders/[id] -------------------- */
export async function GET(_req, { params }) {
  try {
    // ⬇️ await + allow admin & sales
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) return json(false, 401, "unauthorized");

    await connectDB();

    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id))
      return json(false, 400, "Invalid order id");

    const doc = await Order.findById(id).lean();
    if (!doc) return json(false, 404, "Order not found");

    return json(true, 200, doc);
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}

/* ------------------- PATCH /api/admin/orders/[id] ------------------- */
export async function PATCH(req, { params }) {
  try {
    // ⬇️ await + allow admin & sales
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) return json(false, 401, "unauthorized");

    await connectDB();

    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id))
      return json(false, 400, "Invalid order id");

    const body = await req.json().catch(() => ({}));
    const now = new Date();

    const current = await Order.findById(id);
    if (!current) return json(false, 404, "Order not found");

    const setOps = { updatedAt: now };
    const pushOps = {};

    /* ---- status (optional) ---- */
    if (typeof body?.status === "string") {
      const next = trim(body.status);
      if (!ALLOWED_STATUSES.has(next))
        return json(false, 400, "Invalid status value");
      if (next !== current.status) {
        setOps.status = next;
        pushOps["metadata.statusHistory"] = {
          from: current.status || null,
          to: next,
          at: now,
          // best-effort actor info; your isAuthenticated returns boolean,
          // so we can only tag a generic label here.
          by: "admin-portal",
        };
        if (next === "completed" && !current.completedAt)
          setOps.completedAt = now;
        if (next === "cancelled" && !current.cancelledAt)
          setOps.cancelledAt = now;
      }
    }

    /* ---- admin note (optional) ---- */
    if (typeof body?.adminNote === "string") {
      setOps.adminNote = trim(body.adminNote);
    }

    /* ---- payment method (optional) ---- */
    let nextPaymentMethod = (
      body?.paymentMethod ||
      current.paymentMethod ||
      ""
    ).toLowerCase();
    if (body?.paymentMethod !== undefined) {
      if (!ALLOWED_PAYMENTS.has(nextPaymentMethod))
        return json(false, 400, "Invalid payment method");
      if (nextPaymentMethod !== current.paymentMethod) {
        setOps.paymentMethod = nextPaymentMethod;
      }
    } else {
      nextPaymentMethod = (current.paymentMethod || "").toLowerCase();
    }

    /* ---- customer (fullName / phone) ---- */
    const cust = body.customer || {};
    const fullName = trim(cust.fullName ?? body.fullName);
    const rawPhone = cust.phone ?? body.phone;
    if (typeof fullName === "string" && fullName.length)
      setOps["customer.fullName"] = fullName;
    if (typeof rawPhone === "string") {
      const phone = digits10(rawPhone);
      if (phone.length === 10) setOps["customer.phone"] = phone;
      else if (rawPhone?.length)
        return json(false, 400, "Phone must be 10 digits");
    }

    /* ---- address ---- */
    const addr = body.address || {};
    const cityId = addr.cityId ?? body.city;
    const zoneId = addr.zoneId ?? body.zone;
    const areaId = addr.areaId ?? body.area;

    const cityLabel = trim(addr.cityLabel ?? body.cityLabel);
    const zoneLabel = trim(addr.zoneLabel ?? body.zoneLabel);
    const areaLabel = trim(addr.areaLabel ?? body.areaLabel);
    const landmark = trim(addr.landmark ?? body.landmark);

    if (cityId !== undefined) setOps["address.cityId"] = String(cityId);
    if (zoneId !== undefined) setOps["address.zoneId"] = String(zoneId);
    if (areaId !== undefined) setOps["address.areaId"] = String(areaId);
    if (typeof cityLabel === "string") setOps["address.cityLabel"] = cityLabel;
    if (typeof zoneLabel === "string") setOps["address.zoneLabel"] = zoneLabel;
    if (typeof areaLabel === "string") setOps["address.areaLabel"] = areaLabel;
    if (typeof landmark === "string") setOps["address.landmark"] = landmark;

    /* ---- items & amounts (server authority) ---- */
    let itemsToSet = null;
    if (body?.items !== undefined) {
      const cleaned = sanitizeItems(body.items);
      if (cleaned.length === 0)
        return json(false, 400, "At least one valid line item is required");
      itemsToSet = cleaned;
      setOps.items = itemsToSet;
    } else {
      itemsToSet = sanitizeItems(current.items || []);
    }

    const amountsInput = body?.amounts || {};
    const recomputed = computeAmounts({
      items: itemsToSet,
      discount: amountsInput.discount ?? current?.amounts?.discount ?? 0,
      paymentMethod: nextPaymentMethod,
      shippingCost:
        amountsInput.shippingCost ?? current?.amounts?.shippingCost ?? 0,
      codFee: amountsInput.codFee ?? current?.amounts?.codFee ?? 0,
    });
    setOps.amounts = recomputed;

    if (body?.metadata?.pricePlan !== undefined) {
      setOps["metadata.pricePlan"] = body.metadata.pricePlan;
    }

    if (nextPaymentMethod === "qr") {
      setOps["metadata.qr.expected_amount"] = recomputed.total;
      if (current?.metadata?.qr?.submitted === undefined) {
        setOps["metadata.qr.submitted"] = false;
        setOps["metadata.qr.createdAt"] =
          current?.metadata?.qr?.createdAt || new Date();
      }
    }

    const hasSet = Object.keys(setOps).length > 1;
    const hasPush = Object.keys(pushOps).length > 0;
    if (!hasSet && !hasPush) return json(false, 400, "Nothing to update");

    const updated = await Order.findByIdAndUpdate(
      id,
      {
        ...(hasSet ? { $set: setOps } : {}),
        ...(hasPush ? { $push: pushOps } : {}),
      },
      { new: true }
    ).lean();

    return json(true, 200, updated);
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}
