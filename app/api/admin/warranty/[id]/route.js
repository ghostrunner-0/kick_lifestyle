// app/api/admin/warranty/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";

const json = (ok, status, payload) =>
  NextResponse.json(ok ? { success: true, data: payload } : { success: false, message: payload }, { status });

// add months safely (handles month rollover)
function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // last day of previous month if overflow
  return d;
}
function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((a - b) / ms));
}

export async function GET(_req, { params }) {
  try {
    const admin = await isAuthenticated(["admin", "sales"]);
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();
    const param = await params;
    const id = String(param?.id || "");
    if (!mongoose.isValidObjectId(id)) return json(false, 400, "Invalid id");

    const doc = await WarrantyRegistration.findById(id).lean();
    if (!doc) return json(false, 404, "Not found");

    const createdAt = new Date(doc.createdAt);
    const now = new Date();

    // Group items by productId+variantId; compute:
    // - count
    // - warrantyMonths: if consistent across group, else null
    // - daysLeft: if consistent months -> daysLeft; else min days left across items
    const groupsMap = new Map();
    (doc.items || []).forEach((it) => {
      const p = it.product || {};
      const key = `${p.productId || ""}__${p.variantId || ""}`;
      const g = groupsMap.get(key) || {
        key,
        productId: p.productId || null,
        variantId: p.variantId || null,
        productName: p.productName || "",
        variantName: p.variantName || "",
        count: 0,
        monthsSet: new Set(),
        minDaysLeft: Infinity,
      };
      g.count += 1;

      const m = Number(it.warrantyMonths || 0) || 0;
      g.monthsSet.add(m);

      if (m > 0) {
        const expiry = addMonths(createdAt, m);
        const left = daysBetween(expiry, now);
        g.minDaysLeft = Math.min(g.minDaysLeft, left);
      } else {
        g.minDaysLeft = Math.min(g.minDaysLeft, 0);
      }

      groupsMap.set(key, g);
    });

    const summary = Array.from(groupsMap.values()).map((g) => ({
      key: g.key,
      productId: g.productId,
      variantId: g.variantId,
      productName: g.productName,
      variantName: g.variantName,
      count: g.count,
      warrantyMonths: g.monthsSet.size === 1 ? [...g.monthsSet][0] : null,
      daysLeft: Number.isFinite(g.minDaysLeft) ? g.minDaysLeft : null,
    }));

    return json(true, 200, {
      ...doc,
      itemsCount: Array.isArray(doc.items) ? doc.items.length : 0,
      summary,
    });
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}
