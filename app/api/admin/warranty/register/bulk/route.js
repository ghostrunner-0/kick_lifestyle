// app/api/admin/warranty/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";

const json = (ok, status, payload) =>
  NextResponse.json(
    ok ? { success: true, data: payload } : { success: false, message: payload },
    { status }
  );

const isObjId = (v) => mongoose.isValidObjectId(v);
const normSerial = (v) => String(v || "").trim().toUpperCase();

// cap any date to <= today; if invalid returns null
function safePurchaseDate(input) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  // allow same day; disallow future times
  if (d.getTime() > now.getTime()) return new Date(now.setHours(0, 0, 0, 0));
  return d;
}

export async function POST(req) {
  try {
    // ✅ admin + sales
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) return json(false, 401, "not authorized");

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const {
      channel = "kick",
      shopName = channel === "daraz" ? "Daraz" : "Kick",
      userId = null,
      orderId = null,
      customer = {},
      items = [],
      notes = "",
      purchaseDate: rawPurchaseDate, // optional
    } = body || {};

    const purchaseDate = safePurchaseDate(rawPurchaseDate);

    if (!["kick", "daraz", "offline"].includes(channel))
      return json(false, 400, "Invalid channel");
    if (!customer?.name || !customer?.phone)
      return json(false, 400, "Customer name & phone required");
    if (!Array.isArray(items) || !items.length)
      return json(false, 400, "No items to register");

    // normalize incoming items; drop invalids / blanks
    const cleanItems = [];
    const seen = new Set();
    for (const it of items) {
      const serial = normSerial(it?.serial);
      const productName = String(it?.productName || "").trim();
      const variantName = String(it?.variantName || "").trim();
      const warrantyMonths = Number(it?.warrantyMonths || 0);
      if (!serial || !productName || !warrantyMonths) continue;
      if (seen.has(serial)) continue; // dedupe within payload
      seen.add(serial);

      cleanItems.push({
        product: {
          productId: isObjId(it?.productId) ? new mongoose.Types.ObjectId(it.productId) : null,
          variantId: isObjId(it?.variantId) ? new mongoose.Types.ObjectId(it.variantId) : null,
          productName,
          variantName,
        },
        serial,
        warrantyMonths,
      });
    }
    if (!cleanItems.length) return json(false, 400, "Nothing valid to insert");

    // If orderId present → single document per order.
    const filter = isObjId(orderId) ? { orderId: new mongoose.Types.ObjectId(orderId) } : null;

    let existing = null;
    if (filter) existing = await WarrantyRegistration.findOne(filter).lean();

    if (!existing) {
      // create new registration (one doc) with all items
      const doc = await WarrantyRegistration.create({
        userId: isObjId(userId) ? new mongoose.Types.ObjectId(userId) : null,
        orderId: isObjId(orderId) ? new mongoose.Types.ObjectId(orderId) : null,
        channel,
        shopName,
        offlineShopId: null,
        customer: {
          name: String(customer.name).trim(),
          phone: String(customer.phone),
        },
        items: cleanItems,
        notes,
        ...(purchaseDate ? { purchaseDate } : {}), // store purchase date if provided
      });

      return json(true, 201, {
        inserted: cleanItems.length,
        duplicates: 0,
        failed: 0,
        id: doc._id,
      });
    }

    // append mode
    const existingSerials = new Set(
      (existing.items || []).map((x) => normSerial(x.serial))
    );
    const toAdd = cleanItems.filter((x) => !existingSerials.has(normSerial(x.serial)));
    const duplicates = cleanItems.length - toAdd.length;

    if (!toAdd.length) {
      // still update header fields (shop/customer/purchaseDate) if sent
      if (purchaseDate || shopName || customer?.name || customer?.phone) {
        await WarrantyRegistration.updateOne(
          { _id: existing._id },
          {
            $set: {
              channel,
              shopName,
              "customer.name": String(customer.name).trim(),
              "customer.phone": String(customer.phone),
              ...(isObjId(userId) ? { userId: new mongoose.Types.ObjectId(userId) } : {}),
              ...(purchaseDate ? { purchaseDate } : {}),
            },
          }
        );
      }
      return json(true, 200, {
        inserted: 0,
        duplicates,
        failed: 0,
        id: existing._id,
      });
    }

    const updated = await WarrantyRegistration.findOneAndUpdate(
      { _id: existing._id },
      {
        $set: {
          channel,
          shopName,
          "customer.name": String(customer.name).trim(),
          "customer.phone": String(customer.phone),
          ...(isObjId(userId) ? { userId: new mongoose.Types.ObjectId(userId) } : {}),
          ...(purchaseDate ? { purchaseDate } : {}),
        },
        $push: { items: { $each: toAdd } },
      },
      { new: true }
    ).lean();

    return json(true, 200, {
      inserted: toAdd.length,
      duplicates,
      failed: 0,
      id: updated._id,
    });
  } catch (e) {
    // unique index on items.serial protects against cross-doc dupes
    if (e?.code === 11000) {
      return json(false, 409, "Duplicate serial detected");
    }
    return json(false, 500, e?.message || "Server error");
  }
}
