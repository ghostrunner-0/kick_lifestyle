import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import QROrderPayment from "@/models/QrOrderPayment.model";
import Order from "@/models/Orders.model";

// Save inside /public/payments so it's directly accessible at /payments/<file>
const PAY_DIR = process.env.PAYMENTS_DIR || path.join(process.cwd(), "public", "payments");

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();
    const file = form.get("file");
    const orderId = String(form.get("order_id") || "");
    const displayOrderId = String(form.get("display_order_id") || "");
    let amount = Number(form.get("amount") || 0);

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "File required" }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ success: false, message: "order_id is required" }, { status: 400 });
    }

    // Fallback: read amount from the order if client didn't send a good amount
    if (!Number.isFinite(amount) || amount <= 0) {
      const order = await Order.findById(orderId).select({ amounts: 1, metadata: 1 }).lean();
      amount =
        Number(order?.amounts?.total) ||
        Number(order?.metadata?.qr?.expected_amount) ||
        0;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
    }

    await fs.mkdir(PAY_DIR, { recursive: true });

    // Safe extension detection
    const mime = (file.type || "").toLowerCase();
    const ext =
      (mime.includes("png") && "png") ||
      ((mime.includes("jpeg") || mime.includes("jpg")) && "jpg") ||
      (mime.includes("webp") && "webp") ||
      "png";

    const base = (displayOrderId || orderId || `PAY-${Date.now()}`).replace(/[^\w\-]+/g, "-");
    const filename = `${base}.${ext}`;
    const filepath = path.join(PAY_DIR, filename);

    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buf);

    // Public URL served by Next static (because we saved into /public)
    const publicUrl = `/payments/${filename}`;

    const doc = await QROrderPayment.create({
      order: orderId,
      displayOrderId,
      amount,
      proof: {
        filename,
        path: filepath, // absolute path (server ref)
        mime,
        size: buf.length,
        url: publicUrl, // what the client should render
      },
      status: "pending", // will change to 'verified' after manual review
    });

    // Mark the order as "submitted" best-effort (do not fail the request if this errors)
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        "metadata.qr.submitted": true,
        "metadata.qr.proofId": doc._id,
        "metadata.qr.proofUrl": publicUrl,
        "metadata.qr.submittedAt": new Date(),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: doc });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
