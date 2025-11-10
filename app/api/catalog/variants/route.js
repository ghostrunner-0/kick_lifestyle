// /app/api/catalog/variants/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get("q") || "";
    const q = rawQ.toLowerCase().trim();

    // ✅ We explicitly ignore showOnWebsite / visibility flags
    // ✅ We also do NOT filter by deletedAt here, so you truly get "every single one"
    //    If you want to exclude hard-deleted, do it at DB level or add a very explicit condition.

    // 1) Fetch ALL products
    const products = await Product.find({})
      .select("_id name slug warrantyMonths modelNumber")
      .lean();

    const productIds = products.map((p) => p._id);

    // 2) Fetch ALL variants for those products
    const variants = await ProductVariant.find({
      product: { $in: productIds },
    })
      .select("_id product variantName sku stock mrp specialPrice modelNumber")
      .lean();

    const pIndex = new Map(products.map((p) => [String(p._id), p]));

    const rows = [];

    // 3) Product-level rows (base option when there is no variant, or generic match)
    for (const p of products) {
      rows.push({
        type: "product",
        product_id: p._id,
        product_name: p.name || "Unnamed Product",
        product_slug: p.slug || "",
        model_number: p.modelNumber || "",
        warranty_months: p.warrantyMonths ?? null,
        variant_id: null,
        variant_name: "",
        sku: "",
        stock: null,
        mrp: null,
        specialPrice: null,
      });
    }

    // 4) Variant-level rows (one per variant)
    for (const v of variants) {
      const p = pIndex.get(String(v.product));
      if (!p) continue;

      rows.push({
        type: "variant",
        product_id: p._id,
        product_name: p.name || "Unnamed Product",
        product_slug: p.slug || "",
        model_number: v.modelNumber || p.modelNumber || "",
        warranty_months: p.warrantyMonths ?? null,
        variant_id: v._id,
        variant_name: v.variantName || "Variant",
        sku: v.sku || "",
        stock: v.stock ?? null,
        mrp: v.mrp ?? null,
        specialPrice: v.specialPrice ?? null,
      });
    }

    // 5) Optional search across the combined list
    let filtered = rows;
    if (q) {
      filtered = rows.filter((r) => {
        return (
          (r.product_name || "").toLowerCase().includes(q) ||
          (r.variant_name || "").toLowerCase().includes(q) ||
          (r.sku || "").toLowerCase().includes(q) ||
          (r.model_number || "").toLowerCase().includes(q) ||
          (r.product_slug || "").toLowerCase().includes(q)
        );
      });
    }

    // 6) Return EVERYTHING (no pagination slice)
    const total = filtered.length;

    return NextResponse.json({
      items: filtered,
      paging: {
        page: 1,
        pageSize: total,
        total,
      },
    });
  } catch (err) {
    console.error("Catalog variants fetch failed:", err);
    return NextResponse.json(
      { error: err?.message || "Catalog variants fetch failed" },
      { status: 500 }
    );
  }
}
