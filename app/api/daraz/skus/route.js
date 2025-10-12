// /app/api/daraz/skus/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken } from "@/lib/darazToken";
import { getProducts } from "@/lib/darazMini";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    // Gate
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const limit = Math.min(Number(searchParams.get("limit") || 50), 50);
    const options = searchParams.get("options") || "1";
    const create_after = searchParams.get("create_after");
    const update_after = searchParams.get("update_after");
    const q = (searchParams.get("q") || "").toLowerCase();

    const tokenDoc = await ensureFreshDarazToken();
    const access_token = tokenDoc?.access_token;
    if (!access_token) {
      return NextResponse.json({ error: "Daraz not connected" }, { status: 400 });
    }

    // Build only-present params to avoid signature issues
    const p = { filter, limit: String(limit), options };
    if (create_after) p.create_after = create_after;
    if (update_after) p.update_after = update_after;

    // One page fetch (use next_update_after to paginate)
    const res = await getProducts({
      access_token,
      params: p,
    });

    const products = res?.data?.products || [];

    // Flatten SKUs for mapping
    let rows = [];
    for (const p of products) {
      for (const s of p.skus || []) {
        const sellerSku = s.SellerSku || s.seller_sku || "";
        rows.push({
          daraz_item_id: p.item_id,
          daraz_sku_id: s.SkuId ?? null,
          seller_sku: sellerSku,
          daraz_name: (p.attributes?.name || s.name || "").trim(),
          daraz_status: s.Status || p.status || "",
          images: p.images || s.Images || [],
          updated_time: Number(p.updated_time || 0), // ms epoch
        });
      }
    }

    // Filter client query
    if (q) {
      rows = rows.filter(
        (r) =>
          (r.seller_sku || "").toLowerCase().includes(q) ||
          (r.daraz_name || "").toLowerCase().includes(q)
      );
    }

    // Cursor for next page (Daraz preferred: time-based)
    const maxUpdated = Math.max(...rows.map((r) => r.updated_time || 0), 0);
    const next_update_after = maxUpdated
      ? new Date(maxUpdated).toISOString().replace(".000Z", "+0000")
      : null;

    return NextResponse.json({
      items: rows,
      paging: {
        next_update_after,
        page_size: rows.length,
        filter,
      },
      request_id: res?.request_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Daraz SKUs fetch failed" },
      { status: 500 }
    );
  }
}
