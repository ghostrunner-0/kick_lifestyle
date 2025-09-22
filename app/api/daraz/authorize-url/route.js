import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/darazMini";
import { isAuthenticated } from "@/lib/Authentication";

export async function GET() {
  const admin = await isAuthenticated("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const url = buildAuthorizeUrl(); // absolute URL (env-based)
    // Return as JSON so the client can set window.location.href safely
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
