// app/api/website/payments/qr/upload/route.js
import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import QROrderPayment from "@/models/QrOrderPayment.model";

const PAY_DIR = process.env.PAYMENTS_DIR || path.join(process.cwd(), "payments");

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();
    const file = form.get("file");
    const orderId = String(form.get("order_id") || "");
    const displayOrderId = String(form.get("display_order_id") || "");
    const amount = Number(form.get("amount") || 0);

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "File required" }, { status: 400 });
    }

    await fs.mkdir(PAY_DIR, { recursive: true });

    // filename example: <displayOrderId or orderId>.png
    const ext = (file.type?.includes("png") && "png")
      || ((file.type?.includes("jpeg") || file.type?.includes("jpg")) && "jpg")
      || (file.type?.includes("webp") && "webp")
      || "png";
    const base = (displayOrderId || orderId || `PAY-${Date.now()}`).replace(/[^\w\-]+/g, "-");
    const filename = `${base}.${ext}`;
    const filepath = path.join(PAY_DIR, filename);

    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buf);

    const publicUrl = `/payments/${filename}`; // << IMPORTANT

    const doc = await QROrderPayment.create({
      order: orderId,
      displayOrderId,
      amount,
      proof: {
        filename,
        path: filepath,         // absolute file path (for server reference)
        mime: file.type || "",
        size: buf.length,
        url: publicUrl,         // << what the client should render
      },
      status: "pending",
    });

    return NextResponse.json({ success: true, data: doc });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message || "Upload failed" }, { status: 500 });
  }
}
