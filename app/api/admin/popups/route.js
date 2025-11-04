import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";

async function assertAdmin(req) {
  // TODO: replace with your real session check
  // e.g. const user = await getCurrentUser(req); if (!user?.isAdmin) throw new Error("Not allowed");
  return true;
}

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const active = searchParams.get("active");
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  const where = { deletedAt: null };
  if (q) where.title = { $regex: q, $options: "i" };
  if (type) where.type = type;
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  const total = await Popup.countDocuments(where);
  const items = await Popup.find(where)
    .sort({ priority: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return NextResponse.json({ success: true, data: { items, total } });
}

export async function POST(req) {
  await connectDB();
  await assertAdmin(req);
  const body = await req.json();

  const doc = await Popup.create({
    ...body,
  });

  return NextResponse.json({ success: true, data: doc });
}
