// app/api/admin/offline-registration/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import OfflineRegistrationRequest from "@/models/OfflineRegistrationRequest.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "admin not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // pending|approved|rejected
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 50))
    );

    const query = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    const rows = await OfflineRegistrationRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    if (!rows.length) {
      return NextResponse.json(
        { success: true, data: { items: [] } },
        { status: 200 }
      );
    }

    // Collect unique ids
    const productIds = new Set();
    const variantIds = new Set();

    for (const r of rows) {
      if (r.productId) productIds.add(String(r.productId));
      if (r.productVariantId) variantIds.add(String(r.productVariantId));
      // also support legacy nested snapshot -> productVariant?.id
      if (r.productVariant?.id) variantIds.add(String(r.productVariant.id));
    }

    // Load products
    const products = await Product.find(
      { _id: { $in: [...productIds] } },
      { name: 1, modelNumber: 1, heroImage: 1 }
    ).lean();

    const productMap = new Map(products.map((p) => [String(p._id), p]));

    // Load variants
    const variants = await ProductVariant.find(
      { _id: { $in: [...variantIds] } },
      { variantName: 1, sku: 1, product: 1 }
    ).lean();

    const variantMap = new Map(variants.map((v) => [String(v._id), v]));

    // Stitch
    const items = rows.map((r) => {
      const prod = r.productId ? productMap.get(String(r.productId)) : null;

      // prefer explicit productVariantId; fallback to snapshot id
      const vId = r.productVariantId
        ? String(r.productVariantId)
        : r.productVariant?.id
        ? String(r.productVariant.id)
        : null;

      const vDoc = vId ? variantMap.get(vId) : null;

      // normalized variant snapshot for UI (id, name, sku)
      const variantSnap = vDoc
        ? { id: vId, name: vDoc.variantName || "", sku: vDoc.sku || "" }
        : r.productVariant || null; // keep whatever snapshot exists

      return {
        ...r,
        product: prod
          ? {
              _id: prod._id,
              name: prod.name,
              modelNumber: prod.modelNumber,
              heroImage: prod.heroImage || null,
            }
          : null,
        productVariant: variantSnap || null,
      };
    });

    return NextResponse.json(
      { success: true, data: { items } },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/admin/offline-registration error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
