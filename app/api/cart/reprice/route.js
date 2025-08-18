// /app/api/cart/reprice/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Product from "@/models/Product";            // adjust path
import ProductVariant from "@/models/ProductVariant"; // adjust path
import connectDB from "@/lib/connectDB"; // your Mongo connection util

const priceOf = (doc) => {
  // choose the field you actually use
  const p = Number(doc?.specialPrice ?? doc?.price ?? doc?.mrp ?? 0);
  const mrp = Number(doc?.mrp ?? p);
  return { price: p, mrp };
};

const lineKey = ({ productId, variantId }) => `${productId}|${variantId || ""}`;

export async function POST(req) {
  try {
    await connectDB();
    const { lines } = await req.json();

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ lines: [] });
    }

    // Batch fetch products (and variants if any)
    const productIds = [...new Set(lines.map((l) => l.productId))].filter(Boolean);
    const variantIds = [...new Set(lines.map((l) => l.variantId).filter(Boolean))];

    const [products, variants] = await Promise.all([
      Product.find({ _id: { $in: productIds } })
        .select("_id mrp price specialPrice stock hasVariants")
        .lean(),
      variantIds.length
        ? ProductVariant.find({ _id: { $in: variantIds } })
            .select("_id product mrp price specialPrice stock")
            .lean()
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [String(p._id), p]));
    const variantMap = new Map(variants.map((v) => [String(v._id), v]));

    const out = lines.map((l) => {
      const key = lineKey(l);
      const p = productMap.get(String(l.productId));
      if (!p) {
        return { key, status: "missing" };
      }

      let price = 0;
      let mrp = 0;
      let stock = Number(p.stock ?? 0);

      if (l.variantId) {
        const v = variantMap.get(String(l.variantId));
        if (!v || String(v.product) !== String(l.productId)) {
          return { key, status: "missing" };
        }
        const pv = priceOf(v);
        price = pv.price;
        mrp = pv.mrp;
        stock = Number(v.stock ?? 0);
      } else {
        const pp = priceOf(p);
        price = pp.price;
        mrp = pp.mrp;
        stock = Number(p.stock ?? 0);
      }

      const requested = Math.max(0, Number(l.qty || 0));
      const allowedQty = Math.max(0, Math.min(requested, stock));

      let status = "ok";
      if (stock <= 0) status = "out_of_stock";
      else if (allowedQty < requested) status = "cap_qty";

      return { key, price, mrp, stock, allowedQty, status };
    });

    return NextResponse.json({ lines: out });
  } catch (e) {
    console.error("Reprice error:", e);
    return NextResponse.json(
      { message: e.message || "Server error" },
      { status: 500 }
    );
    }
}
