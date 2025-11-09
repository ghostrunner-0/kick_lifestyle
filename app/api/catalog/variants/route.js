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
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase();
    const includeArchived = searchParams.get("includeArchived") === "1";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 50)));

    // Base queries
    const productMatch = includeArchived ? {} : { deletedAt: null, showInWebsite: true };
    const variantMatch = includeArchived ? {} : { deletedAt: null };

    // Fetch in two steps: products → variants
    const products = await Product.find(productMatch)
      .select("_id name slug warrantyMonths modelNumber stock mrp specialPrice hasVariants")
      .lean();

    const productIds = products.map(p => p._id);

    const variants = await ProductVariant.find({ product: { $in: productIds }, ...variantMatch })
      .select("_id product variantName sku stock mrp specialPrice")
      .lean();

    // Build index by productId for quick lookup
    const pIndex = new Map(products.map(p => [String(p._id), p]));

    const variantRows = variants.map(v => {
      const p = pIndex.get(String(v.product));
      return {
        product_id: p?._id,
        product_name: p?.name,
        product_slug: p?.slug,
        model_number: p?.modelNumber,
        warranty_months: p?.warrantyMonths,
        variant_id: v._id,
        variant_name: v.variantName,
        sku: v.sku,
        stock: v.stock,
        mrp: v.mrp,
        specialPrice: v.specialPrice ?? null,
        is_variant: true,
      };
    });

    const variantProductIds = new Set(variants.map(v => String(v.product)));

    const productRows = products
      .filter(p => !variantProductIds.has(String(p._id)))
      .map(p => ({
        product_id: p._id,
        product_name: p.name,
        product_slug: p.slug,
        model_number: p.modelNumber,
        warranty_months: p.warrantyMonths,
        variant_id: null,
        variant_name: null,
        sku: null,
        stock: p.stock,
        mrp: p.mrp,
        specialPrice: p.specialPrice ?? null,
        is_variant: false,
      }));

    let rows = [...variantRows, ...productRows];

    // Search filter
    if (q) {
      rows = rows.filter(r =>
        (r.product_name || "").toLowerCase().includes(q) ||
        (r.variant_name || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.model_number || "").toLowerCase().includes(q)
      );
    }

    // Paginate (client can refine with q)
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = rows.slice(start, end);

    return NextResponse.json({
      items: paged,
      paging: { page, pageSize, total }
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Catalog variants fetch failed" }, { status: 500 });
  }
}
