// app/api/pathao/areas/route.js
import { response, catchError } from "@/lib/helperFunctions";
import { pathaoGet } from "@/lib/pathaoClient";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const zoneId = searchParams.get("zoneId");
    if (!zoneId) return response(false, 400, "zoneId is required");

    const json = await pathaoGet(`/aladdin/api/v1/zones/${encodeURIComponent(zoneId)}/area-list`);
    const arr = json?.data?.data ?? json?.data ?? [];
    const data = arr.map((a) => ({
      area_id: Number(a.area_id ?? a.id),
      area_name: a.area_name ?? a.name ?? "",
      home_delivery_available: Boolean(a.home_delivery_available),
      pickup_available: Boolean(a.pickup_available),
    }));
    return response(true, 200, "Areas fetched", data);
  } catch (err) {
    return catchError(err, "Failed to fetch areas");
  } 
}
