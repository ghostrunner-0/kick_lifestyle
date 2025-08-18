// app/api/pathao/zones/route.js
import { response, catchError } from "@/lib/helperFunctions";
import { pathaoGet } from "@/lib/pathaoClient";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get("cityId");
    if (!cityId) return response(false, 400, "cityId is required");

    const json = await pathaoGet(`/aladdin/api/v1/cities/${encodeURIComponent(cityId)}/zone-list`);
    const arr = json?.data?.data ?? json?.data ?? [];
    const data = arr.map((z) => ({
      zone_id: Number(z.zone_id ?? z.id),
      zone_name: z.zone_name ?? z.name ?? "",
    }));
    return response(true, 200, "Zones fetched", data);
  } catch (err) {
    return catchError(err, "Failed to fetch zones");
  }
}
