export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import OfflineShop from "@/models/OfflineShop.model";
import ServiceIssue from "@/models/ServiceIssue.model";
import ServiceRequestOffline from "@/models/ServiceRequestOffline.model";

const json = (ok, status, payload) =>
  NextResponse.json(
    ok ? { success: true, data: payload } : { success: false, message: payload },
    { status }
  );

const digits10 = (s) => (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);

export async function POST(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const body = await req.json();
    const shopId = String(body?.shopId || "");
    const customer = body?.customer || {};
    const items = Array.isArray(body?.items) ? body.items : [];
    const intake = body?.intake || {};

    if (!mongoose.isValidObjectId(shopId)) return json(false, 400, "Invalid shopId");
    if (!customer?.name?.trim()) return json(false, 400, "Customer name required");
    if (!customer?.phone?.trim()) return json(false, 400, "Customer phone required");
    if (items.length === 0) return json(false, 400, "No items provided");

    const shop = await OfflineShop.findById(shopId).lean();
    if (!shop) return json(false, 404, "Shop not found");

    // validate issues
    const issueIds = items.map((i) => i.issueId).filter(Boolean);
    let issueMap = {};
    if (issueIds.length) {
      const issues = await ServiceIssue.find({ _id: { $in: issueIds } }).lean();
      issueMap = Object.fromEntries(issues.map((x) => [String(x._id), x]));
    }

    const normItems = items.map((i) => ({
      productId: i.productId ? new mongoose.Types.ObjectId(i.productId) : null,
      variantId: i.variantId ? new mongoose.Types.ObjectId(i.variantId) : null,
      serial: (i.serial || "").trim(),
      issueId: i.issueId ? new mongoose.Types.ObjectId(i.issueId) : null,
      issueName: i.issueName || issueMap[String(i.issueId)]?.name || "",
      note: (i.note || "").trim(),
    }));

    const doc = await ServiceRequestOffline.create({
      shopId: shop._id,
      shopName: shop.name || "",
      customer: {
        name: customer.name.trim(),
        phone: digits10(customer.phone),
      },
      items: normItems,
      intake: {
        method: intake.method || "walk-in",
        paidBy: intake.paidBy || null,
        amount: Number(intake.amount || 0) || undefined,
        trackingRef: intake.trackingRef || "",
        notes: intake.notes || "",
      },
      status: "new",
      createdBy: admin?.email || admin?.id || "admin",
    });

    return json(true, 201, { _id: doc._id });
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}
