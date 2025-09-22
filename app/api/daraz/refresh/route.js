import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken } from "@/lib/darazToken";

export async function POST() {
  const admin = await isAuthenticated("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await connectDB();
  const tokenDoc = await ensureFreshDarazToken(true); // force refresh if you want
  if (!tokenDoc?.access_token) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  return NextResponse.json({
    connected: true,
    account: tokenDoc.account || null,
    country: tokenDoc.country || (process.env.DARAZ_COUNTRY || "").toUpperCase(),
    expiresAt: tokenDoc.expires_at || null,
  });
}
