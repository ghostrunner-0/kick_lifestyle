import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken, readDarazToken } from "@/lib/darazToken";

export const runtime = "nodejs";

export async function GET() {
  const admin = await isAuthenticated("admin");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();

  // Try refresh; fallback to raw read
  let tokenDoc = null;
  try {
    tokenDoc = await ensureFreshDarazToken();
  } catch {
    // ignore
  }
  if (!tokenDoc) tokenDoc = await readDarazToken();

  const envCountry = (process.env.DARAZ_COUNTRY || "").toUpperCase();

  if (!tokenDoc?.access_token) {
    return NextResponse.json({
      connected: false,
      account: null,
      country: envCountry || null,
      savedAt: null,
      access_expires_at: null,
      access_ttl_seconds: null,
      refresh_ttl_seconds: null,
      env_country: envCountry || null,
    });
  }

  // Compute TTLs / expiries based on savedAt + expires_in, refresh_expires_in
  const now = Date.now();
  const savedAtMs = tokenDoc.savedAt ? new Date(tokenDoc.savedAt).getTime() : null;

  const accessExpAt = savedAtMs && tokenDoc.expires_in
    ? savedAtMs + tokenDoc.expires_in * 1000
    : null;

  const refreshExpAt = savedAtMs && tokenDoc.refresh_expires_in
    ? savedAtMs + tokenDoc.refresh_expires_in * 1000
    : null;

  const accessTTL =
    accessExpAt != null ? Math.max(0, Math.floor((accessExpAt - now) / 1000)) : null;

  const refreshTTL =
    refreshExpAt != null ? Math.max(0, Math.floor((refreshExpAt - now) / 1000)) : null;

  return NextResponse.json({
    connected: true,
    account: tokenDoc.account || null,
    country: tokenDoc.country || envCountry || null,
    savedAt: tokenDoc.savedAt || null,
    // extra diagnostics
    expires_in: tokenDoc.expires_in ?? null,
    refresh_expires_in: tokenDoc.refresh_expires_in ?? null,
    access_expires_at: accessExpAt ?? null,
    access_ttl_seconds: accessTTL,
    refresh_ttl_seconds: refreshTTL,
    env_country: envCountry || null,
  });
}
