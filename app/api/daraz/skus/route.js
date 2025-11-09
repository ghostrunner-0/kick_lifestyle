// /app/api/daraz/skus/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken } from "@/lib/darazToken";
import { getProducts } from "@/lib/darazMini";

function extractVariant(rawSku = {}) {
  const variationCandidates = [
    rawSku.Variation,
    rawSku.variation,
    rawSku.variation_label,
    rawSku.variation_name,
    rawSku.sku_name,
    rawSku.SkuName,
  ];

  for (const candidate of variationCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const value = candidate.includes(":")
        ? candidate.split(":").slice(1).join(":").trim()
        : candidate.trim();
      if (value) return value;
    }
  }

  const arrays = [
    rawSku.sku_properties,
    rawSku.SkuProperties,
    rawSku.sku_property,
    rawSku.SkuProperty,
    rawSku.properties,
    rawSku.Properties,
    rawSku.attribute,
    rawSku.attributes,
  ];

  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    const parts = arr
      .map((prop) => {
        if (!prop || typeof prop !== "object") return "";
        const name =
          prop.name ||
          prop.Name ||
          prop.attribute_name ||
          prop.AttributeName ||
          prop.property_name ||
          prop.PropertyName ||
          "";
        const value =
          prop.value ||
          prop.Value ||
          prop.attribute_value ||
          prop.AttributeValue ||
          prop.property_value ||
          prop.PropertyValue ||
          "";
        if (value && name) return `${name}: ${value}`;
        return value || name || "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }

  if (rawSku && typeof rawSku === "object") {
    const value = rawSku.sku_variant || rawSku.variant || rawSku.Variant;
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

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
          daraz_variant: extractVariant(s),
          daraz_status: s.Status || p.status || "",
          images: p.images || s.Images || [],
          updated_time: Number(p.updated_time || 0), // ms epoch
        });
      }
    }

    // Filter client query
    if (q) {
      rows = rows.filter((r) => {
        const sku = (r.seller_sku || "").toLowerCase();
        const name = (r.daraz_name || "").toLowerCase();
        const variant = (r.daraz_variant || "").toLowerCase();
        return sku.includes(q) || name.includes(q) || variant.includes(q);
      });
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
