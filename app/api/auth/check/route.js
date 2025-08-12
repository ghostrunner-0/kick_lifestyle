import { isAuthenticated } from "@/lib/Authentication";
import { response } from "@/lib/helperFunctions";
import { NextResponse } from "next/server";

export async function GET(request) {
  const admin = await isAuthenticated("admin");
  if (!admin) {
    return response(false,401,'unauthorized')
  }
  return NextResponse.json({ success: true, message: "User authenticated" });
}
