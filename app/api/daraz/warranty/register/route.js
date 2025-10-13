// /app/api/daraz/warranty/register/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";

export const runtime = "nodejs";

/*
Expected payload:
{
  channel: "daraz",
  shopName: "Daraz",
  userId: null,
  orderId: null,
  darazOrderId: "213174421890805",   // <-- NEW (string)
  customer: { name, phone },
  notes: "Daraz order 213174421890805",
  items: [
    { productId, variantId, productName, variantName, serial, warrantyMonths },
    ...
  ]
}
*/

const cleanStr = (s) => (s == null ? "" : String(s)).trim();
function asObjectId(maybe) {
  try { return maybe ? new mongoose.Types.ObjectId(String(maybe)) : null; }
  catch { return null; }
}

export async function POST(req) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();

    const channel       = cleanStr(body?.channel || "daraz");
    const shopName      = cleanStr(body?.shopName || "Daraz");
    const userId        = asObjectId(body?.userId);
    const orderId       = asObjectId(body?.orderId);
    const darazOrderId  = cleanStr(body?.darazOrderId || ""); // <-- use it
    const notes         = cleanStr(body?.notes);

    const customer = {
      name:  cleanStr(body?.customer?.name),
      phone: cleanStr(body?.customer?.phone),
    };

    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ success: false, message: "No items to register" }, { status: 400 });
    }
    if (!customer.name || !customer.phone) {
      return NextResponse.json({ success: false, message: "Customer name & phone are required" }, { status: 400 });
    }

    // Normalize rows to the model shape
    const normalizedItems = items.map((r) => ({
      product: {
        productId:   asObjectId(r.productId),
        variantId:   asObjectId(r.variantId),
        productName: cleanStr(r.productName),
        variantName: cleanStr(r.variantName),
      },
      serial: cleanStr(r.serial).toUpperCase(),
      warrantyMonths: Number(r.warrantyMonths || 12),
    }));

    // De-dupe by the unique index on items.serial (global)
    const serials = normalizedItems.map((i) => i.serial).filter(Boolean);
    const existing = await WarrantyRegistration.find(
      { "items.serial": { $in: serials } },
      { "items.serial": 1, _id: 0 }
    ).lean();

    const existingSerials = new Set(
      existing.flatMap((doc) => (doc.items || []).map((i) => i.serial))
    );

    const newItems   = normalizedItems.filter((i) => !existingSerials.has(i.serial));
    const duplicates = serials.filter((s) => existingSerials.has(s));

    let inserted = 0;
    let failed   = 0;

    if (newItems.length) {
      // Try to save all in one document (nice audit per submit)
      const doc = {
        userId,
        orderId,
        channel,
        shopName,
        customer,
        notes,
        darazOrderId, // <-- save it
        items: newItems,
      };

      try {
        await WarrantyRegistration.create(doc);
        inserted = newItems.length;
      } catch (e) {
        // Fall back to one-by-one (handles unique serial races)
        inserted = 0; failed = 0;
        for (const item of newItems) {
          try {
            await WarrantyRegistration.create({
              userId, orderId, channel, shopName, customer, notes, darazOrderId, items: [item],
            });
            inserted += 1;
          } catch {
            failed += 1;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { inserted, duplicates: duplicates.length, failed },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err?.message || "Registration failed" },
      { status: 500 }
    );
  }
}
