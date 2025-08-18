// app/api/website/coupons/apply/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Coupon from "@/models/Coupon.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

/**
 * Helpers
 */
const idStr = (v) =>
  typeof v === "object" && v?._id ? String(v._id) : v != null ? String(v) : "";

function effectiveDiscount(coupon) {
  const switched =
    Number(coupon.changeAfterUsage || 0) > 0 &&
    Number(coupon.redemptionsTotal || 0) >= Number(coupon.changeAfterUsage || 0);

  const type = switched && coupon.newDiscountType ? coupon.newDiscountType : coupon.discountType;
  const amount =
    switched && (coupon.newDiscountAmount ?? null) != null
      ? Number(coupon.newDiscountAmount)
      : Number(coupon.discountAmount);

  return { type, amount };
}

/**
 * Strict eligibility:
 *  - If specificProducts has items → require ANY of those products in cart (ignore variants).
 *  - Else if specificVariants has items → require ANY of those variants in cart.
 *  - Else → global.
 * Returns { eligible, reason, matchedItems }
 *   matchedItems are the items to which a money discount should apply (if any).
 */
function evaluateEligibility(coupon, items) {
  const productIds = (coupon?.specificProducts || []).map(idStr);
  const variantIds = (coupon?.specificVariants || []).map(idStr);

  // cart sets
  const setProduct = new Set(items.map((it) => String(it.productId)));
  const setVariant = new Set(items.map((it) => String(it.variantId || "")));

  // product-first gate
  if (productIds.length > 0) {
    const eligible = productIds.some((pid) => setProduct.has(String(pid)));
    if (!eligible) {
      return { eligible: false, reason: "Coupon targets specific products not in cart", matchedItems: [] };
    }
    const matchedItems = items.filter((it) => productIds.includes(String(it.productId)));
    return { eligible: true, reason: "Eligible by product", matchedItems };
  }

  // strict variant gate
  if (variantIds.length > 0) {
    const eligible = variantIds.some((vid) => setVariant.has(String(vid)));
    if (!eligible) {
      return { eligible: false, reason: "Coupon targets specific variants not in cart", matchedItems: [] };
    }
    const matchedItems = items.filter((it) => variantIds.includes(String(it.variantId || "")));
    return { eligible: true, reason: "Eligible by variant", matchedItems };
  }

  // global
  return { eligible: true, reason: "Eligible (global)", matchedItems: items.slice() };
}

/**
 * Free item eligibility:
 * - Coupon must be eligible (by product/variant/global).
 * - If freeItem.variant exists -> that variant MUST be in the cart.
 */
function evaluateFreeItemEligibility(coupon, items) {
  const res = { exists: false, eligible: false, variantId: null, qty: 0 };
  const vId = coupon?.freeItem?.variant?._id ?? coupon?.freeItem?.variant ?? null;
  if (!vId) return res; // no free item on coupon

  res.exists = true;
  res.variantId = idStr(vId);
  res.qty = Math.max(1, Number(coupon?.freeItem?.qty || 1));
  // Eligible if coupon itself is eligible (checked before calling this)
  res.eligible = true;
  return res;
}

export async function POST(req) {
  try {
    await connectDB();

    const { code, items = [], userId = null } = await req.json();

    if (!code || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: "code and items[] are required" },
        { status: 400 }
      );
    }

    const normCode = String(code).trim().toUpperCase();

    // Find active coupon by code (ignore soft-deleted)
    const coupon = await Coupon.findOne({ code: normCode, deletedAt: null }).lean();
    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "Invalid coupon code" },
        { status: 404 }
      );
    }

    // High-level gates (optional usage checks you may enforce here)
    if (Number(coupon.totalLimit || 0) > 0 && Number(coupon.redemptionsTotal || 0) >= Number(coupon.totalLimit)) {
      return NextResponse.json(
        { success: false, message: "Coupon redemption limit reached" },
        { status: 400 }
      );
    }

    // NOTE: perUserLimit enforcement typically needs historical data. You can check separately.

    const normItems = items.map((it) => ({
      productId: idStr(it.productId),
      variantId: it.variantId ? idStr(it.variantId) : null,
      qty: Math.max(0, Number(it.qty || 0)),
      price: Math.max(0, Number(it.price || 0)),
    }));

    // Strict eligibility evaluation
    const elig = evaluateEligibility(coupon, normItems);
    if (!elig.eligible) {
      return NextResponse.json(
        {
          success: true,
          data: {
            eligible: false,
            reason: elig.reason,
            moneyDiscount: { applies: false, type: null, amount: 0, applied: 0 },
            freeItem: { exists: !!coupon?.freeItem, eligible: false, variantId: null, qty: 0 },
          },
        },
        { status: 200 }
      );
    }

    // Effective discount (before free-item rule)
    const { type, amount } = effectiveDiscount(coupon);

    // Free item eligibility check
    const freeCheck = evaluateFreeItemEligibility(coupon, normItems);

    // If coupon includes a free item:
    //  - Grant free item if coupon is eligible, regardless of free item variant presence in cart
    if (freeCheck.exists && freeCheck.eligible) {
      // fetch free item names for UI
      const fv = await ProductVariant.findById(freeCheck.variantId)
        .select("_id variantName product")
        .populate({ path: "product", select: "_id name", model: "Product" })
        .lean();

      return NextResponse.json(
        {
          success: true,
          data: {
            eligible: true,
            reason: "Eligible (free-item)",
            moneyDiscount: { applies: false, type: null, amount: 0, applied: 0 },
            freeItem: {
              exists: true,
              eligible: true,
              variantId: freeCheck.variantId,
              qty: freeCheck.qty,
              productId: fv?.product?._id ? String(fv.product._id) : null,
              productName: fv?.product?.name || "",
              variantName: fv?.variantName || "",
            },
          },
        },
        { status: 200 }
      );
    }

    // Otherwise: normal money discount on matched items only
    let base = 0;
    for (const it of elig.matchedItems) {
      base += Number(it.price || 0) * Number(it.qty || 0);
    }

    let applied = 0;
    if (type === "percentage") {
      applied = Math.round((base * Number(amount || 0)) / 100);
    } else if (type === "fixed") {
      applied = Math.min(base, Number(amount || 0));
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          eligible: true,
          reason: "Eligible (money discount)",
          moneyDiscount: {
            applies: applied > 0,
            type,
            amount: Number(amount || 0),
            applied,
            base,
          },
          freeItem: { exists: false, eligible: false, variantId: null, qty: 0 },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const msg = err?.response?.data?.message || err?.message || "Failed to apply coupon";
    return NextResponse.json(
      { success: false, message: msg },
      { status }
    );
  }
}
