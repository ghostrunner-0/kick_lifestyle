import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";

function pathMatches(pages = [], path = "/") {
  if (!pages.length) return true; // global
  // supports prefix wildcard like "/product/*"
  return pages.some((p) => {
    if (p.endsWith("*")) return path.startsWith(p.slice(0, -1));
    return p === path;
  });
}

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/";

  const now = new Date();
  const docs = await Popup.find({
    deletedAt: null,
    isActive: true,
    $or: [{ startAt: null }, { startAt: { $lte: now } }],
    $or: [{ endAt: null }, { endAt: { $gte: now } }],
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  const filtered = docs.filter((d) => pathMatches(d.pages || [], path));
  return NextResponse.json({ success: true, data: filtered });
}
