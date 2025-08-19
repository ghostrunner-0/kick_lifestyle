import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import PaymentQRConfig from "@/models/PaymentQrConfig.model";

export async function GET() {
  try {
    await connectDB();
    const cfg = await PaymentQRConfig.findById("active").lean();
    if (!cfg) {
      return NextResponse.json({ success: false, message: "QR not configured" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: cfg });
  } catch (e) {
    return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
  }
}
