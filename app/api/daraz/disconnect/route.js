import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { clearDarazToken } from "@/lib/darazToken";

export async function POST() {
  const admin = await isAuthenticated("admin");
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await connectDB();
  await clearDarazToken();

  return NextResponse.json({
    connected: false,
    account: null,
    country: (process.env.DARAZ_COUNTRY || "").toUpperCase(),
    expiresAt: null,
  });
}
