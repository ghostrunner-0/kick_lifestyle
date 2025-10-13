// /app/api/warranty/manual/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";

import WarrantyRegistration from "@/models/WarrantyRegistration.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

export const runtime = "nodejs";

const digits10 = (s) => (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);

export async function POST(req) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    // --------- Basic validation ---------
    const allowedChannels = ["kick", "khalti", "offline"];
    const channel = String(body?.channel || "kick").toLowerCase();
    if (!allowedChannels.includes(channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }

    const customerName = String(body?.customer?.name || "").trim();
    const customerPhone = digits10(body?.customer?.phone || "");
    if (!customerName || !customerPhone) {
      return NextResponse.json({ error: "Customer name and phone are required" }, { status: 400 });
    }

    let shopName = "";
    if (channel === "offline") {
      shopName = String(body?.shopName || "").trim();
      if (!shopName) {
        return NextResponse.json({ error: "Custom shop name is required for offline channel" }, { status: 400 });
      }
    } else if (channel === "khalti") {
      shopName = "Khalti";
    } else {
      shopName = "Kick";
    }

    const rawItems = Array.isArray(body?.items) ? body.items : [];
    if (!rawItems.length) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // --------- Pre-hydrate products/variants to fill names & warranty ---------
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean).map(String)));
    const pids = uniq(rawItems.map((it) => it?.productId));
    const vids = uniq(rawItems.map((it) => it?.variantId));

    const [prods, vars] = await Promise.all([
      pids.length
        ? Product.find({ _id: { $in: pids } }, { name: 1, modelNumber: 1, warrantyMonths: 1 }).lean()
        : [],
      vids.length
        ? ProductVariant.find({ _id: { $in: vids } }, { variantName: 1, sku: 1, product: 1 }).lean()
        : [],
    ]);

    const prodById = new Map(prods.map((p) => [String(p._id), p]));
    const varById = new Map(vars.map((v) => [String(v._id), v]));
    const wByPid = new Map(prods.map((p) => [String(p._id), Number(p.warrantyMonths || 12)]));

    // --------- Normalize items & validate serials ---------
    const items = [];
    const incomingSerials = [];

    for (const it of rawItems) {
      const productId = it?.productId ? String(it.productId) : null;
      const variantId = it?.variantId ? String(it.variantId) : null;

      const prod = productId ? prodById.get(productId) : null;
      const vari = variantId ? varById.get(variantId) : null;

      const productName = String(it?.productName || prod?.name || "").trim();
      const variantName = String(it?.variantName || vari?.variantName || "").trim();
      if (!productName) {
        return NextResponse.json({ error: "Each item needs a valid product (pick a website variant)" }, { status: 400 });
      }

      const serial = String(it?.serial || "").trim().toUpperCase();
      if (!serial) {
        return NextResponse.json({ error: "Serial is required for all items" }, { status: 400 });
      }
      incomingSerials.push(serial);

      // ✅ Always take warranty from Product doc (fallback 12)
      const warrantyMonths = productId && wByPid.has(productId) ? wByPid.get(productId) : 12;

      items.push({
        product: {
          productId: productId || null,
          variantId: variantId || null,
          productName,
          variantName,
        },
        serial,
        warrantyMonths,
      });
    }

    // --------- Duplicate serial precheck ---------
    const dupExisting = await WarrantyRegistration.find(
      { "items.serial": { $in: incomingSerials } },
      { "items.serial": 1 }
    ).lean();

    if (dupExisting?.length) {
      const collided = new Set();
      dupExisting.forEach((doc) => {
        (doc.items || []).forEach((it) => {
          if (incomingSerials.includes(it.serial)) collided.add(it.serial);
        });
      });
      return NextResponse.json(
        { error: "Some serial numbers already exist", duplicates: Array.from(collided) },
        { status: 409 }
      );
    }

    // --------- Create registration ---------
    const doc = await WarrantyRegistration.create({
      channel,
      shopName,
      userId: staff?._id || null,
      orderId: null,
      darazOrderId: "",
      customer: { name: customerName, phone: digits10(customerPhone) },
      items,
      notes: String(body?.notes || "").trim(),
    });

    return NextResponse.json({ success: true, id: String(doc._id) }, { status: 201 });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "Duplicate serial found (unique index)", details: err?.keyValue || null },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err?.message || "Create failed" }, { status: 500 });
  }
}
