// app/api/pathao/stores/route.js
import { response, catchError } from "@/lib/helperFunctions";
import { pathaoGet } from "@/lib/pathaoClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const json = await pathaoGet("/aladdin/api/v1/stores");
    const data = json?.data?.data ?? json?.data ?? [];
    return response(true, 200, "Stores fetched", data);
  } catch (err) {
    return catchError(err, "Failed to fetch stores");
  }
}
