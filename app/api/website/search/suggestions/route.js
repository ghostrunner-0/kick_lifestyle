import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Category from "@/models/Category";

function escRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "8", 10), 20);

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const re = new RegExp("^" + escRegex(q), "i");

    // Products by name prefix
    const prod = await Product.find({
      showInWebsite: true,
      deletedAt: null,
      name: re,
    })
      .select("name slug")
      .limit(limit)
      .lean();

    // Variants by SKU prefix
    const vars = await ProductVariant.find({
      deletedAt: null,
      sku: re,
    })
      .select("sku product")
      .limit(limit)
      .lean();

    // Categories by name prefix
    const cats = await Category.find({
      deletedAt: null,
      name: re,
    })
      .select("name slug")
      .limit(limit)
      .lean();

    const productSug = prod.map((p) => ({
      type: "product",
      label: p.name,
      value: p.slug,
      href: `/product/${p.slug}`,
    }));

    const skuSug = vars.map((v) => ({
      type: "sku",
      label: v.sku,
      value: v.sku,
    }));

    const catSug = cats.map((c) => ({
      type: "category",
      label: c.name,
      value: `/c/${c.slug}`,
      href: `/c/${c.slug}`,
    }));

    // De-dup + cap
    const all = [...productSug, ...skuSug, ...catSug];
    const seen = new Set();
    const suggestions = [];
    for (const s of all) {
      const key = `${s.type}:${s.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push(s);
      }
      if (suggestions.length >= limit) break;
    }

    return NextResponse.json({ success: true, suggestions });
  } catch (error) {
    console.error("suggestions error:", error);
    return NextResponse.json({ success: false, message: "Failed to load suggestions" }, { status: 500 });
  }
}
