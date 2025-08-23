export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import OfflineShop from "@/models/OfflineShop.model";

const json = (ok, status, payload) =>
  NextResponse.json(
    ok ? { success: true, data: payload } : { success: false, message: payload },
    { status }
  );

const trim = (v) => (typeof v === "string" ? v.trim() : v);

export async function GET(_req, { params }) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id)) return json(false, 400, "Invalid shop id");

    const doc = await OfflineShop.findById(id).lean();
    if (!doc) return json(false, 404, "Shop not found");

    return json(true, 200, doc);
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}

export async function PATCH(req, { params }) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id)) return json(false, 400, "Invalid shop id");

    const body = await req.json().catch(() => ({}));
    const setOps = {};

    if (body.name !== undefined) {
      const name = trim(body.name);
      if (!name) return json(false, 400, "Shop name cannot be empty");
      setOps.name = name;
    }
    if (body.phone !== undefined) setOps.phone = trim(body.phone || "");
    if (body.location !== undefined) setOps.location = trim(body.location || "");
    if (body.contactPerson !== undefined) setOps.contactPerson = trim(body.contactPerson || "");

    if (!Object.keys(setOps).length) return json(false, 400, "Nothing to update");

    // Optional duplicate check (only if name + phone both present now)
    if (setOps.name || setOps.phone) {
      const name = setOps.name ?? (await OfflineShop.findById(id).select("name").lean())?.name;
      const phone = setOps.phone ?? (await OfflineShop.findById(id).select("phone").lean())?.phone;
      if (name && phone) {
        const dupe = await OfflineShop.findOne({ _id: { $ne: id }, name, phone }).lean();
        if (dupe) return json(false, 409, "A shop with the same name and phone already exists");
      }
    }

    const updated = await OfflineShop.findByIdAndUpdate(
      id,
      { $set: setOps },
      { new: true }
    ).lean();

    if (!updated) return json(false, 404, "Shop not found");
    return json(true, 200, updated);
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}

export async function DELETE(_req, { params }) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id)) return json(false, 400, "Invalid shop id");

    const deleted = await OfflineShop.findByIdAndDelete(id).lean();
    if (!deleted) return json(false, 404, "Shop not found");

    return json(true, 200, { _id: id, deleted: true });
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}
