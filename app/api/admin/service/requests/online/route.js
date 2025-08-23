export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";
import ServiceIssue from "@/models/ServiceIssue.model";
import ServiceRequestOnline from "@/models/ServiceRequestOnline.model";

const json = (ok, status, payload) =>
  NextResponse.json(
    ok ? { success: true, data: payload } : { success: false, message: payload },
    { status }
  );

export async function POST(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const body = await req.json();
    const registrationId = String(body?.registrationId || "");
    const items = Array.isArray(body?.items) ? body.items : [];
    const intake = body?.intake || {};

    if (!mongoose.isValidObjectId(registrationId))
      return json(false, 400, "Invalid registrationId");
    if (items.length === 0) return json(false, 400, "No items provided");

    // Get registration
    const reg = await WarrantyRegistration.findById(registrationId).lean();
    if (!reg) return json(false, 404, "Warranty registration not found");

    // Validate issues (allow free-text issueName if issueId missing)
    const issueIds = items.map((i) => i.issueId).filter(Boolean);
    let issueMap = {};
    if (issueIds.length) {
      const issues = await ServiceIssue.find({
        _id: { $in: issueIds },
      }).lean();
      issueMap = Object.fromEntries(issues.map((x) => [String(x._id), x]));
    }

    const normItems = items.map((i) => ({
      productId: i.productId || null,
      variantId: i.variantId || null,
      serial: (i.serial || "").trim(),
      issueId: i.issueId ? new mongoose.Types.ObjectId(i.issueId) : null,
      issueName: i.issueName || issueMap[String(i.issueId)]?.name || "",
      note: (i.note || "").trim(),
    }));

    const doc = await ServiceRequestOnline.create({
      registrationId: reg._id,
      orderId: reg.orderId || null,
      userId: reg.userId || null,
      customer: reg.customer,
      channel: reg.channel,
      shopName: reg.shopName,
      warrantyMonths: reg.warrantyMonths,
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
