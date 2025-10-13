// /app/api/warranty/[id]/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";
import mongoose from "mongoose";

export const runtime = "nodejs";

/**
 * DELETE /api/warranty/:id[?serial=SER]
 * - If serial provided → remove that item; if last item → remove doc.
 * - Else delete entire registration.
 */
export async function DELETE(req, { params }) {
  try {
    const staff = await isAuthenticated(["admin"]);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await connectDB();

    const regId = params?.id;
    const { searchParams } = new URL(req.url);
    const serial = (searchParams.get("serial") || "").trim();

    if (!regId || !mongoose.Types.ObjectId.isValid(regId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const doc = await WarrantyRegistration.findById(regId);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (serial) {
      // remove one item by serial
      const before = doc.items.length;
      doc.items = doc.items.filter((it) => (it?.serial || "") !== serial);
      if (doc.items.length === 0) {
        await doc.deleteOne();
        return NextResponse.json({ ok: true, deletedRegistration: true });
      } else if (doc.items.length === before) {
        return NextResponse.json({ error: "Serial not found" }, { status: 404 });
      }
      await doc.save();
      return NextResponse.json({ ok: true, deletedItem: true });
    }

    // delete whole registration
    await doc.deleteOne();
    return NextResponse.json({ ok: true, deletedRegistration: true });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}
