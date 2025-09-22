// /app/api/daraz/auth/callback/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { tokenCreate } from "@/lib/darazMini";
import { saveDarazToken } from "@/lib/darazToken";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.json({ success: false, message: "Missing code" }, { status: 400 });
    }

    const tokenBundle = await tokenCreate(code);
    await saveDarazToken(tokenBundle);

    // Build an ABSOLUTE redirect URL
    // Prefer configured site URL, otherwise use request origin.
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || url.origin;

    const dest = new URL("/admin/integrations?daraz=ok", base);
    // 303 is nice after an OAuth GET callback
    return NextResponse.redirect(dest, { status: 303 });
  } catch (err) {
    const url = new URL(req.url);
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || url.origin;
    const errorDest = new URL(
      "/admin/integrations?daraz=fail",
      base
    );

    // If you want to show an error page, redirect there;
    // otherwise return JSON:
    // return NextResponse.json({ success:false, message: err?.message || "Callback failed" }, { status: 500 });

    return NextResponse.redirect(errorDest, { status: 303 });
  }
}
