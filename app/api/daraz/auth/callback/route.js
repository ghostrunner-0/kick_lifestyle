import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { tokenCreate } from "@/lib/darazMini";
import { saveDarazToken } from "@/lib/darazToken";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Missing code" },
        { status: 400 }
      );
    }

    const tokenBundle = await tokenCreate(code);
    await saveDarazToken(tokenBundle);

    // Optional: redirect to your admin page with a success flag
    return NextResponse.redirect("/admin/integrations?daraz=ok", {
      status: 302,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err?.message || "Callback failed" },
      { status: 500 }
    );
  }
}
