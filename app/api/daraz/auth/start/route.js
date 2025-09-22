import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { buildAuthorizeUrl } from "@/lib/darazMini";

export const runtime = "nodejs";

export async function GET() {
  const admin = await isAuthenticated("admin");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await connectDB();
  const url = buildAuthorizeUrl();
  return NextResponse.redirect(url, { status: 302 });
}
