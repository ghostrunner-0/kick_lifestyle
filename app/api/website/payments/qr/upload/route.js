import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import QROrderPayment from "@/models/QrOrderPayment.model";
import Order from "@/models/Orders.model";

// ✅ Save directly inside your main Next.js project folder (not /public)
const PAY_DIR =
  process.env.PAYMENTS_DIR || path.join(process.cwd(), "payments");

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();
    const file = form.get("file");
    const orderId = String(form.get("order_id") || "");
    let amount = Number(form.get("amount") || 0);

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "File required" },
        { status: 400 }
      );
    }
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "order_id is required" },
        { status: 400 }
      );
    }

    // Fetch and verify order
    const order = await Order.findById(orderId)
      .select({
        paymentMethod: 1,
        display_order_id: 1,
        display_order_prefix: 1,
        amounts: 1,
        metadata: 1,
      })
      .lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // ✅ Ensure it's a QR order with the proper BLQ prefix
    if (
      order.paymentMethod !== "qr" ||
      !(order.display_order_id || "").startsWith("BLQ-")
    ) {
      return NextResponse.json(
        { success: false, message: "Not a QR order / bad prefix" },
        { status: 400 }
      );
    }

    // Fallback: read amount from order if missing
    if (!Number.isFinite(amount) || amount <= 0) {
      amount =
        Number(order?.amounts?.total) ||
        Number(order?.metadata?.qr?.expected_amount) ||
        0;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid amount" },
        { status: 400 }
      );
    }

    // ✅ Ensure the /payments folder exists in your main project dir
    await fs.mkdir(PAY_DIR, { recursive: true });

    // Detect extension safely
    const mime = (file.type || "").toLowerCase();
    const ext =
      (mime.includes("png") && "png") ||
      ((mime.includes("jpeg") || mime.includes("jpg")) && "jpg") ||
      (mime.includes("webp") && "webp") ||
      "png";

    // ✅ Always use server-side order ID as filename (guarantees BLQ prefix)
    const base = order.display_order_id; // e.g., "BLQ-2034"
    const filename = `${base}.${ext}`;
    const filepath = path.join(PAY_DIR, filename);

    // Write file
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buf);

    // The file is saved inside your app folder under `/payments`
    const relativeUrl = `/payments/${filename}`;

    // Save DB record
    const doc = await QROrderPayment.create({
      order: orderId,
      displayOrderId: order.display_order_id,
      amount,
      proof: {
        filename,
        path: filepath, // absolute path on disk
        mime,
        size: buf.length,
        url: relativeUrl, // internal ref (not public)
      },
      status: "pending",
    });

    // Mark order as proof submitted
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        "metadata.qr.submitted": true,
        "metadata.qr.proofId": doc._id,
        "metadata.qr.proofUrl": relativeUrl,
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
