import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";

async function assertAdmin(req) {
  return true;
}

export async function PUT(req, { params }) {
  await connectDB();
  await assertAdmin(req);
  const body = await req.json();
  const updated = await Popup.findByIdAndUpdate(
    params.id,
    { $set: body },
    { new: true }
  ).lean();
  if (!updated)
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404 }
    );
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req, { params }) {
  await connectDB();
  await assertAdmin(req);
  await Popup.findByIdAndUpdate(params.id, {
    $set: { deletedAt: new Date(), isActive: false },
  });
  return NextResponse.json({ success: true });
}
