import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";

export async function POST(req, { params }) {
  await connectDB();
  const { kind } = await req.json(); // "impression" | "click" | "copy"
  const inc = {};
  if (kind === "impression") inc["stats.impressions"] = 1;
  if (kind === "click") inc["stats.clicks"] = 1;
  if (kind === "copy") inc["stats.copies"] = 1;

  if (!Object.keys(inc).length) {
    return NextResponse.json(
      { success: false, message: "Invalid kind" },
      { status: 400 }
    );
  }

  await Popup.findByIdAndUpdate(params.id, { $inc: inc });
  return NextResponse.json({ success: true });
}
