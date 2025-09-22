import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken, readDarazToken } from "@/lib/darazToken";

export async function GET() {
  const admin = await isAuthenticated("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await connectDB();

  // Try auto-refresh; if that returns null, fall back to raw read
  let tokenDoc = await ensureFreshDarazToken().catch(() => null);
  if (!tokenDoc) tokenDoc = await readDarazToken();

  if (!tokenDoc?.access_token) {
    return NextResponse.json({
      connected: false,
      account: null,
      country: (process.env.DARAZ_COUNTRY || "").toUpperCase(),
      expiresAt: null,
    });
  }

  return NextResponse.json({
    connected: true,
    account: tokenDoc.account || null,
    country: tokenDoc.country || (process.env.DARAZ_COUNTRY || "").toUpperCase(),
    expiresAt: tokenDoc.expires_at || null,
  });
}
