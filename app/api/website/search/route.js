import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Category from "@/models/Category";

function escRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickImage(p) {
  return p?.heroImage?.path || p?.productMedia?.[0]?.path || "";
}

function priceOf(p) {
  return p?.specialPrice ?? p?.mrp ?? null;
}

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    // optional filters
    const categorySlug = (searchParams.get("category") || "").trim();
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "0");
    const inStock = (searchParams.get("inStock") || "").toLowerCase() === "true";
    const sort = (searchParams.get("sort") || "relevance").toLowerCase();

    if (!q) {
      return NextResponse.json({ success: true, query: "", results: [] });
    }

    // Build base match
    const regex = new RegExp(escRegex(q), "i");
    const prodMatch = {
      showInWebsite: true,
      deletedAt: null,
      $or: [{ name: regex }, { modelNumber: regex }, { slug: regex }, { shortDesc: regex }],
    };

    // Category filter
    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug, deletedAt: null }).select("_id").lean();
      if (cat?._id) prodMatch.category = cat._id;
      else return NextResponse.json({ success: true, query: q, results: [] });
    }

    // Price filter: apply after fetch (since price is derived)
    // Stock filter: can apply directly
    if (inStock) {
      prodMatch.stock = { $gt: 0 };
    }

    // 1) Direct product hits
    const directProducts = await Product.find(prodMatch)
      .select("name slug mrp specialPrice stock heroImage productMedia category")
      .populate({ path: "category", select: "name slug" })
      .limit(100)
      .lean();

    // 2) Variant hits -> collect product ids
    const variantHits = await ProductVariant.find({
      deletedAt: null,
      $or: [{ sku: regex }, { variantName: regex }],
    })
      .select("product sku")
      .limit(150)
      .lean();

    const variantProductIds = Array.from(new Set(variantHits.map((v) => String(v.product))));
    const missingIds = variantProductIds.filter(
      (id) => !directProducts.some((p) => String(p._id) === id)
    );

    const variantProducts = missingIds.length
      ? await Product.find({
          _id: { $in: missingIds },
          showInWebsite: true,
          deletedAt: null,
          ...(inStock ? { stock: { $gt: 0 } } : {}),
        })
          .select("name slug mrp specialPrice stock heroImage productMedia category")
          .populate({ path: "category", select: "name slug" })
          .lean()
      : [];

    // Merge + attach one representative sku for display
    const skuByProduct = {};
    for (const v of variantHits) {
      const pid = String(v.product);
      if (!skuByProduct[pid]) skuByProduct[pid] = v.sku;
    }

    const merged = [...directProducts, ...variantProducts];

    // Optional: filter by price band now that we can compute
    const filtered = merged.filter((p) => {
      const price = priceOf(p);
      if (Number.isFinite(minPrice) && minPrice > 0 && price != null && price < minPrice) return false;
      if (Number.isFinite(maxPrice) && maxPrice > 0 && price != null && price > maxPrice) return false;
      return true;
    });

    // Basic ranking: sku match > name start > name contains
    const lowerQ = q.toLowerCase();
    const ranked = filtered
      .map((p) => {
        const pid = String(p._id);
        const name = p.name || "";
        const hasSkuHit = Boolean(skuByProduct[pid]);
        const nameL = name.toLowerCase();
        let rank = 3;
        if (hasSkuHit) rank = 0;
        else if (nameL.startsWith(lowerQ)) rank = 1;
        else if (nameL.includes(lowerQ)) rank = 2;

        return {
          id: pid,
          slug: p.slug,
          name: p.name,
          sku: skuByProduct[pid] || "",
          category: p.category?.name || "",
          categorySlug: p.category?.slug || "",
          imageUrl: pickImage(p),
          price: priceOf(p),
          stock: p.stock ?? 0,
          href: `/product/${p.slug}`,
          rank,
        };
      })
      .sort((a, b) => {
        if (sort === "price_asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
        if (sort === "price_desc") return (b.price ?? -Infinity) - (a.price ?? -Infinity);
        if (sort === "relevance") return a.rank - b.rank || (b.stock > 0) - (a.stock > 0);
        return a.rank - b.rank;
      })
      .slice(0, limit);

    return NextResponse.json({ success: true, query: q, results: ranked });
  } catch (error) {
    console.error("search error:", error);
    return NextResponse.json({ success: false, message: "Search failed" }, { status: 500 });
  }
}
