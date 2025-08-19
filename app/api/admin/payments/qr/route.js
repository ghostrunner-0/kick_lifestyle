// app/api/admin/payments/qr/route.js  (GET list)
import path from "path";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import QROrderPayment from "@/models/QrOrderPayment.model";
import { isAuthenticated } from "@/lib/Authentication";

const asWebUrl = (file) => {
  if (!file) return { url: "" };
  if (file.url) return { url: file.url }; // preferred
  if (file.path) {
    const base = file.path.split(/[\\/]/).pop(); // handles Windows + POSIX
    return { url: base ? `/payments/${base}` : "" };
  }
  return { url: "" };
};

export async function GET(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const q = (searchParams.get("q") || "").trim();

    const filter = { status };
    // optional query filter
    if (q) {
      filter.$or = [
        { displayOrderId: { $regex: q, $options: "i" } },
        { order: q }, // if you want exact match for ObjectId string
        { amount: Number.isFinite(Number(q)) ? Number(q) : -1 },
      ];
    }

    const docs = await QROrderPayment.find(filter).sort({ createdAt: -1 }).lean();

    const data = docs.map((d) => ({
      _id: String(d._id),
      createdAt: d.createdAt,
      display_order_id: d.displayOrderId || "",
      order_id: String(d.order || ""),
      amount: d.amount || 0,
      status: d.status || "pending",
      // normalize proof -> image for your table component
      image: asWebUrl(d.proof),
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message || "Server error" }, { status: 500 });
  }
}
