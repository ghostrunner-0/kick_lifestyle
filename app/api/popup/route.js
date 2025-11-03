// app/api/popup/route.js
import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import { response, catchError } from "@/lib/helperFunctions";

export async function GET() {
  try {
    await connectDB();
    const items = await Popup.find().sort({ updatedAt: -1 }).limit(50);
    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: "Failed to list popups" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();
    const { _id, ...rest } = await req.json();
    if (!_id) return response(false, 400, "_id required");

    const updated = await Popup.findByIdAndUpdate(
      _id,
      { $set: rest },
      { new: true }
    );
    return response(true, 200, "Popup updated", updated);
  } catch (err) {
    return catchError(err, "Failed to update popup");
  }
}
