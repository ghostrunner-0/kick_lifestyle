// app/api/popup/active/route.js
import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const forced = await Popup.findById(id);
      return NextResponse.json(forced || null);
    }

    const now = new Date();
    const active = await Popup.find({
      enabled: true,
      $and: [
        { $or: [{ startAt: { $lte: now } }, { startAt: { $exists: false } }] },
        { $or: [{ endAt: { $gte: now } }, { endAt: { $exists: false } }] },
      ],
    })
      .sort({ priority: -1, updatedAt: -1 })
      .limit(1);

    return NextResponse.json(active[0] || null);
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: "Failed to fetch active popup" },
      { status: 500 }
    );
  }
}
