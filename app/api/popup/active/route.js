import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";

// path match util (prefix wildcard "/foo/*")
function pathMatches(pages, path) {
  if (!Array.isArray(pages) || pages.length === 0) return true; // global
  return pages.some((pattern) => {
    if (!pattern) return false;
    if (pattern.endsWith("*")) {
      const base = pattern.slice(0, -1);
      return path.startsWith(base);
    }
    return path === pattern;
  });
}

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const forcedId = searchParams.get("id");
    const path = searchParams.get("path") || "/";

    if (forcedId) {
      const forced = await Popup.findById(forcedId);
      return NextResponse.json({ data: forced || null });
    }

    const now = new Date();
    const doc = await Popup.findOne({
      deletedAt: null,
      isActive: true,
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
      ],
    }).sort({ priority: -1, updatedAt: -1 });

    if (!doc || !pathMatches(doc.pages, path)) {
      return NextResponse.json({ data: null });
    }
    return NextResponse.json({ data: doc });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: "Failed to fetch active popup" },
      { status: 500 }
    );
  }
}
