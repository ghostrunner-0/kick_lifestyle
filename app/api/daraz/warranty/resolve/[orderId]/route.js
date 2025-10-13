import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken } from "@/lib/darazToken";
import { getOrder, getOrderItems } from "@/lib/darazMini";

// ✅ use your models instead of raw collections
import DarazProductMap from "@/models/DarazProductMap.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";
import WarrantyRegistration from "@/models/WarrantyRegistration.model"; // <-- added

export const runtime = "nodejs";

// helpers
const normStr = (s) => (s == null ? "" : String(s)).trim();
const normSku = (s) => normStr(s).toUpperCase();

export async function GET(_req, { params }) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();

    const p = await params;
    const orderId = p?.orderId;
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    // ✅ DUPLICATE GUARD: block if this Daraz order has already been registered
    const already = await WarrantyRegistration.findOne({
      channel: "daraz",
      darazOrderId: String(orderId),
    }).lean();

    if (already) {
      return NextResponse.json(
        {
          error: "Warranty registration for this Daraz order already exists.",
          darazOrderId: String(orderId),
          reg_id: String(already._id),
          createdAt: already.createdAt,
        },
        { status: 409 } // Conflict
      );
    }

    const tokenDoc = await ensureFreshDarazToken();
    const access_token = tokenDoc?.access_token;
    if (!access_token) return NextResponse.json({ error: "Daraz not connected" }, { status: 400 });

    // Fetch Daraz order + items
    const [order, items] = await Promise.all([
      getOrder(orderId, access_token),
      getOrderItems(orderId, access_token),
    ]);

    // Buyer (Daraz → UI)
    const buyer = {
      name:    order?.address_shipping?.first_name || order?.customer_first_name || "",
      phone:   order?.address_shipping?.phone || order?.address_billing?.phone || "",
      email:   order?.customer_email || "",
      address: order?.address_shipping?.address1 || order?.shipping_address || "",
      city:    order?.address_shipping?.city || "",
      country: order?.address_shipping?.country || tokenDoc?.country || "",
    };

    // Normalize items (we’ll only use Website products after mapping)
    const lines = (items || []).map((it) => {
      const seller_sku = normSku(it.sku || it.SellerSku || it.seller_sku);
      const shop_sku   = normSku(it.shop_sku || it.ShopSku || it.shopSku);
      const sku_id     = normStr(it.sku_id || it.SkuId || it.order_item_id); // keep as string
      const variation  = normStr(it.variation || it.Variation || it.variation_label || "");
      const variantTxt = variation.includes(":") ? variation.split(":").slice(1).join(":").trim() : variation;

      return {
        seller_sku,
        shop_sku,
        sku_id,
        daraz_sku_id: it.SkuId ?? it.order_item_id ?? null,
        daraz_item_id: order?.order_id || null, // for reference
        daraz_name: it.name || it.product_name || "",
        daraz_variant: variantTxt,
        qty: Number(it.quantity ?? it.qty ?? 1),
        price: Number(it.item_price ?? it.paid_price ?? 0),
        daraz_image: it.product_main_image || "",
      };
    });

    // Build lookup keys
    const sellerSkus = Array.from(new Set(lines.map(l => l.seller_sku).filter(Boolean)));
    const shopSkus   = Array.from(new Set(lines.map(l => l.shop_sku).filter(Boolean)));
    const skuIds     = Array.from(new Set(lines.map(l => l.sku_id).filter(Boolean)));

    // 🔎 Load mappings via Mongoose model
    const orClauses = [];
    if (sellerSkus.length) orClauses.push({ seller_sku_norm: { $in: sellerSkus } }, { seller_sku: { $in: sellerSkus } });
    if (shopSkus.length)   orClauses.push({ shop_sku_norm:   { $in: shopSkus } },   { shop_sku:   { $in: shopSkus } });
    if (skuIds.length)     orClauses.push({ daraz_sku_id:    { $in: skuIds } },     { sku_id:     { $in: skuIds } });

    const maps = orClauses.length
      ? await DarazProductMap.find({ $or: orClauses }).lean()
      : [];

    // Prepare lookup maps
    const preparedMaps = maps.map(m => ({
      ...m,
      seller_sku_norm: normSku(m.seller_sku),
      shop_sku_norm:   normSku(m.shop_sku),
      sku_id_str:      normStr(m.daraz_sku_id || m.sku_id),
      product_id_str:  m.product_id ? String(m.product_id) : "",
      variant_id_str:  m.variant_id ? String(m.variant_id) : "",
    }));

    const bySeller = new Map(preparedMaps.filter(m => m.seller_sku_norm).map(m => [m.seller_sku_norm, m]));
    const byShop   = new Map(preparedMaps.filter(m => m.shop_sku_norm).map(m => [m.shop_sku_norm, m]));
    const bySkuId  = new Map(preparedMaps.filter(m => m.sku_id_str).map(m => [m.sku_id_str, m]));

    // Gather Website ids to hydrate via models
    const productIds = Array.from(new Set(preparedMaps.map(m => m.product_id_str).filter(Boolean)))
      .map(id => new mongoose.Types.ObjectId(id));
    const variantIds = Array.from(new Set(preparedMaps.map(m => m.variant_id_str).filter(Boolean)))
      .map(id => new mongoose.Types.ObjectId(id));

    // Hydrate website products/variants (light projection)
    const [prods, vars] = await Promise.all([
      productIds.length
        ? Product.find(
            { _id: { $in: productIds } },
            { name: 1, modelNumber: 1, warrantyMonths: 1, heroImage: 1 }
          ).lean()
        : [],
      variantIds.length
        ? ProductVariant.find(
            { _id: { $in: variantIds } },
            { variantName: 1, sku: 1, product: 1, stock: 1 }
          ).lean()
        : [],
    ]);

    const prodById = new Map(prods.map(p => [String(p._id), p]));
    const varById  = new Map(vars.map(v => [String(v._id), v]));
    const wByPid   = new Map(prods.map(p => [String(p._id), Number(p.warrantyMonths || 12)]));

    // Attach mapping + website hydration
    const outItems = lines.map((l) => {
      const m =
        bySeller.get(l.seller_sku) ||
        (l.shop_sku ? byShop.get(l.shop_sku) : null) ||
        (l.sku_id ? bySkuId.get(l.sku_id) : null);

      if (!m) {
        // Unmapped — show Daraz info so UI can hint to map
        return { ...l, mapped: false, website: null };
      }

      const pid = m.product_id_str;
      const vid = m.variant_id_str;

      const prod = pid ? prodById.get(pid) : null;
      const vari = vid ? varById.get(vid) : null;

      // Warranty: prefer product doc; then mapping override; default 12
      let warranty_months = 12;
      if (pid && wByPid.has(pid)) {
        warranty_months = wByPid.get(pid);
      } else if (m.warranty_months != null && !isNaN(m.warranty_months)) {
        warranty_months = Number(m.warranty_months);
      }

      const website = {
        product_id:     pid || "",
        product_name:   prod?.name || "",
        model_number:   prod?.modelNumber || "",
        warranty_months,
        hero_image:     prod?.heroImage || null,

        variant_id:     vid || "",
        variant_name:   vari?.variantName || "",
        sku:            vari?.sku || "",
        stock:          typeof vari?.stock === "number" ? vari.stock : null,
      };

      return {
        ...l,
        mapped: true,
        website,
        display_name:    website.product_name || l.daraz_name,
        display_variant: website.variant_name || l.daraz_variant,
      };
    });

    const mappedOnly = outItems.filter((x) => x.mapped);

    return NextResponse.json({
      order_id: String(orderId),
      order_seq: order?.order_number || order?.order_id || String(orderId),
      buyer,
      total: Number(order?.price || 0),

      // All items (so you can warn about unmapped)
      items: outItems,

      // Website-only items for the serial entry flow
      mapped_items: mappedOnly,

      raw_count: outItems.length,
      mapped_count: mappedOnly.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Resolve failed" }, { status: 500 });
  }
}
