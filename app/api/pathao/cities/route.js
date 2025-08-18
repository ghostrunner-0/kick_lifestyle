// app/api/pathao/cities/route.js
import { response, catchError } from "@/lib/helperFunctions";
import { pathaoGet } from "@/lib/pathaoClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const json = await pathaoGet("/aladdin/api/v1/city-list");
    // Pathao sometimes nests as { data: { data: [...] } }
    const arr = json?.data?.data ?? json?.data ?? [];
    const data = arr.map((c) => ({
      city_id: Number(c.city_id ?? c.id),
      city_name: c.city_name ?? c.name ?? "",
    }));
    return response(true, 200, "Cities fetched", data);
  } catch (err) {
    return catchError(err, "Failed to fetch cities");
  }
}
