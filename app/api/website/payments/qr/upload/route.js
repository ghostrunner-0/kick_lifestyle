import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Order from "@/models/Orders.model";
import QROrderPayment from "@/models/QrOrderPayment.model";
import path from "path";
import fs from "fs/promises";

const EXT_FROM_MIME = (m = "", fallback = "png") =>
  m.includes("png") ? "png" :
  (m.includes("jpeg") || m.includes("jpg")) ? "jpg" :
  m.includes("webp") ? "webp" :
  m.includes("gif") ? "gif" : fallback;

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();
    const file = form.get("file");
    const orderId = String(form.get("order_id") || "");
    const displayId = String(form.get("display_order_id") || "");
    const amount = Number(form.get("amount") || 0);

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "Missing file" }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ success: false, message: "Missing order_id" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
    }

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }
    if (order.paymentMethod !== "qr") {
      return NextResponse.json({ success: false, message: "Not a QR order" }, { status: 400 });
    }

    const BASE_DIR = process.env.PAYMENTS_DIR || path.join(process.cwd(), "payments");
    await fs.mkdir(BASE_DIR, { recursive: true });

    const mime = file.type || "";
    const ext = EXT_FROM_MIME(mime, "png");

    // Use display_order_id for the filename if provided; else fallback to order _id
    const nameBase =
      displayId?.trim()
        ? displayId.trim().replace(/[^A-Za-z0-9-_]/g, "-")
        : order?.display_order_id || order._id.toString();

    const filename = `${nameBase}.${ext}`;
    const filepath = path.join(BASE_DIR, filename);

    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buf);

    // Upsert one "latest" pending payment per order, or create multiple—your call.
    // Here we create a new record each time:
    const paymentDoc = await QROrderPayment.create({
      order: order._id,
      displayOrderId: order.display_order_id || displayId || undefined,
      amount,
      proof: { filename, path: filepath, mime, size: buf.length },
      status: "pending",
    });

    // Reflect status on Order
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "payment not verified",
          "payment.status": "unverified",
          "payment.provider": "qr",
          "payment.proofRef": paymentDoc._id,
        },
      }
    );

    return NextResponse.json({ success: true, data: { payment_id: paymentDoc._id.toString(), filename } });
  } catch (e) {
    return NextResponse.json({ success: false, message: e?.message || "Upload failed" }, { status: 500 });
  }
}
