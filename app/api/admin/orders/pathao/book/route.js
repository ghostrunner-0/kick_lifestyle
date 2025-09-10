export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

import { pathaoPost, resolvePathaoStoreId } from "@/lib/pathaoClient";

const PATHAO_DELIVERY_TYPE = Number(process.env.PATHAO_DELIVERY_TYPE || 48);
const PATHAO_ITEM_TYPE = Number(process.env.PATHAO_ITEM_TYPE || 2);
const PATHAO_DEFAULT_WEIGHT = Number(process.env.PATHAO_DEFAULT_WEIGHT_KG || 0.5);

function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }
function sumQty(items = []) { return items.reduce((a, b) => a + Number(b?.qty || 0), 0); }
function formatAddress(address = {}) {
  return [address?.landmark, address?.areaLabel, address?.zoneLabel, address?.cityLabel].filter(Boolean).join(", ");
}
function orderDescription(order) {
  const names = (order?.items || []).map((it) => it?.variantName ? `${it?.name} - ${it.variantName}` : it?.name);
  return names.filter(Boolean).slice(0, 5).join(", ");
}
// only COD collects money
function codAmount(order) {
  const isCOD = String(order?.paymentMethod || "").toLowerCase() === "cod";
  return isCOD ? Math.round(Number(order?.amounts?.total || 0)) : 0;
}
function kgWeight(order) {
  const w = Number(order?.metadata?.packageWeight) || Number(order?.shipping?.packageWeight) || PATHAO_DEFAULT_WEIGHT;
  return Math.max(0.5, Math.min(10, Number.isFinite(w) ? w : 0.5));
}

/**
 * POST /api/admin/orders/pathao/book
 * body: { ids: string[], dryRun?: boolean, storeId?: number }
 */
export async function POST(req) {
  // ✅ allow admin + sales and AWAIT the check
  const allowed = await isAuthenticated(["admin", "sales"]);
  if (!allowed) {
    return NextResponse.json({ success: false, message: "not authorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids : [];
  const dryRun = !!body?.dryRun;

  const oids = ids
    .filter((id) => /^[0-9a-fA-F]{24}$/.test(String(id)))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (oids.length === 0) {
    return NextResponse.json({ success: false, message: "No valid order ids" }, { status: 400 });
  }

  let storeId = Number(body?.storeId || 0);
  try {
    if (!storeId) storeId = await resolvePathaoStoreId();
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e?.message || "Failed to resolve Pathao store" },
      { status: 500 }
    );
  }

  const orders = await Order.find({ _id: { $in: oids } })
    .select({
      _id: 1,
      display_order_id: 1,
      customer: 1,
      address: 1,
      items: 1,
      amounts: 1,
      paymentMethod: 1,
      payment: 1,
      metadata: 1,
      shipping: 1,
    })
    .lean();

  if (!orders.length) {
    return NextResponse.json({ success: false, message: "Orders not found" }, { status: 404 });
  }

  const toSend = [];
  const skipped = [];

  for (const o of orders) {
    const cityId = Number(o?.address?.cityId ?? o?.address?.pathaoCityId ?? o?.metadata?.pathaoCityId);
    const zoneId = Number(o?.address?.zoneId ?? o?.address?.pathaoZoneId ?? o?.metadata?.pathaoZoneId);
    const areaId = Number(o?.address?.areaId ?? o?.address?.pathaoAreaId ?? o?.metadata?.pathaoAreaId);

    if (!cityId || !zoneId) {
      skipped.push({ id: String(o._id), reason: "Missing Pathao city/zone id" });
      continue;
    }

    toSend.push({
      _local_order_id: String(o._id),
      store_id: storeId,
      merchant_order_id: o?.display_order_id || String(o._id),
      recipient_name: o?.customer?.fullName || "Customer",
      recipient_phone: String(o?.customer?.phone || "").replace(/[^\d]/g, ""),
      recipient_secondary_phone: undefined,
      recipient_address: formatAddress(o?.address) || "Kathmandu, Nepal",
      recipient_city: cityId,
      recipient_zone: zoneId,
      recipient_area: areaId || undefined,
      delivery_type: PATHAO_DELIVERY_TYPE,
      item_type: PATHAO_ITEM_TYPE,
      special_instruction: o?.metadata?.notes || o?.notes || undefined,
      item_quantity: Math.max(1, sumQty(o?.items)),
      item_weight: kgWeight(o),
      amount_to_collect: codAmount(o), // COD totals; otherwise 0
      item_description: orderDescription(o),
    });
  }

  if (!toSend.length) {
    return NextResponse.json(
      { success: false, message: "No orders eligible to send (address IDs missing).", details: { skipped } },
      { status: 400 }
    );
  }

  if (dryRun) {
    return NextResponse.json({ success: true, message: "Dry run payload", data: { orders: toSend, skipped } });
  }

  const CHUNK = 50;
  const chunks = chunk(toSend, CHUNK);
  const accepted = [];
  const failed = [];

  for (const batch of chunks) {
    try {
      const payload = { orders: batch.map(({ _local_order_id, ...rest }) => rest) };
      const res = await pathaoPost("/aladdin/api/v1/orders/bulk", payload);

      const ok =
        Number(res?.code) === 202 ||
        res?.data === true ||
        String(res?.type || "").toLowerCase() === "success";

      if (ok) accepted.push(...batch.map((b) => b._local_order_id));
      else failed.push({ ids: batch.map((b) => b._local_order_id), error: res });
    } catch (e) {
      failed.push({
        ids: batch.map((b) => b._local_order_id),
        error: { status: e?.response?.status, data: e?.response?.data, message: e?.message },
      });
    }
  }

  if (accepted.length) {
    await Order.updateMany(
      { _id: { $in: accepted.map((id) => new mongoose.Types.ObjectId(id)) } },
      {
        $set: {
          "shipping.carrier": "pathao",
          "metadata.pathao.bulkAccepted": true,
          "metadata.pathao.bulkAcceptedAt": new Date(),
        },
      }
    );
  }

  const failedCount = failed.reduce((a, b) => a + b.ids.length, 0);

  return NextResponse.json({
    success: failedCount === 0,
    message:
      failedCount === 0
        ? `Pathao accepted ${accepted.length} order(s).`
        : `Accepted ${accepted.length}, failed ${failedCount}.`,
    data: { accepted, failed, skipped, storeId },
  });
}
