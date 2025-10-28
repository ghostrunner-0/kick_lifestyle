// app/api/website/coupons/apply/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Coupon from "@/models/Coupon.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";
import Order from "@/models/Orders.model";

const idStr = (v) =>
  typeof v === "object" && v?._id ? String(v._id) : v != null ? String(v) : "";
const num = (v) => (Number.isFinite(+v) ? +v : 0);

function effectiveDiscount(c) {
  const switched =
    num(c.changeAfterUsage) > 0 &&
    num(c.redemptionsTotal) >= num(c.changeAfterUsage);
  return {
    type: switched && c.newDiscountType ? c.newDiscountType : c.discountType,
    amount:
      switched && c.newDiscountAmount != null
        ? num(c.newDiscountAmount)
        : num(c.discountAmount),
  };
}

function evaluateEligibility(coupon, items) {
  const pIds = (coupon?.specificProducts || []).map(idStr);
  const vIds = (coupon?.specificVariants || []).map(idStr);
  const setP = new Set(items.map((it) => String(it.productId)));
  const setV = new Set(items.map((it) => String(it.variantId || "")));

  if (pIds.length) {
    const ok = pIds.some((pid) => setP.has(pid));
    if (!ok)
      return {
        eligible: false,
        reason: "Targets specific products not in cart",
        matchedItems: [],
      };
    return {
      eligible: true,
      reason: "Eligible by product",
      matchedItems: items.filter((it) => pIds.includes(String(it.productId))),
    };
  }
  if (vIds.length) {
    const ok = vIds.some((vid) => setV.has(vid));
    if (!ok)
      return {
        eligible: false,
        reason: "Targets specific variants not in cart",
        matchedItems: [],
      };
    return {
      eligible: true,
      reason: "Eligible by variant",
      matchedItems: items.filter((it) =>
        vIds.includes(String(it.variantId || ""))
      ),
    };
  }
  return {
    eligible: true,
    reason: "Eligible (global)",
    matchedItems: items.slice(),
  };
}

const pickBestImage = (variant, product) => {
  const vgal = Array.isArray(variant?.productGallery)
    ? variant.productGallery
    : [];
  const pm = Array.isArray(product?.productMedia) ? product.productMedia : [];
  return (
    vgal[0]?.path ||
    variant?.swatchImage?.path ||
    product?.heroImage?.path ||
    pm[0]?.path ||
    "/placeholder.png"
  );
};

// bundle from VARIANT id
async function getVariantBundle(variantId) {
  const v = await ProductVariant.findById(variantId)
    .select(
      "_id variantName mrp specialPrice product productGallery swatchImage stock deletedAt"
    )
    .populate({
      path: "product",
      model: Product,
      select: "_id name heroImage productMedia hasVariants stock deletedAt",
    })
    .lean();
  if (!v || v.deletedAt || v?.product?.deletedAt) return null;

  const unitPrice = num(v.specialPrice ?? v.mrp);
  const productId = v.product?._id ? String(v.product._id) : null;
  const productName = v.product?.name || "";
  const variantName = v.variantName || "";
  const bestImage = pickBestImage(v, v.product);

  const variantStock = num(v.stock);
  const productStock = num(v.product?.stock);
  const inStock = v.product?.hasVariants ? variantStock > 0 : productStock > 0;

  return {
    unitPrice,
    productId,
    productName,
    variantName,
    bestImage,
    product: v.product || null,
    variant: {
      _id: v._id,
      variantName: v.variantName,
      mrp: v.mrp,
      specialPrice: v.specialPrice ?? null,
      productGallery: v.productGallery || [],
      swatchImage: v.swatchImage || null,
      stock: variantStock,
    },
    chosenVariantId: String(v._id),
    productStock,
    variantStock,
    inStock,
  };
}

// bundle from PRODUCT id (auto-pick an in-stock variant if product has variants)
async function getProductBundle(productId) {
  const p = await Product.findById(productId)
    .select(
      "_id name heroImage productMedia hasVariants stock deletedAt mrp specialPrice"
    )
    .lean();
  if (!p || p.deletedAt) return null;

  // No variants: use product price & stock
  if (!p.hasVariants) {
    const unitPrice = num(p.specialPrice ?? p.mrp);
    const bestImage =
      p.heroImage?.path ||
      (Array.isArray(p.productMedia) && p.productMedia[0]?.path) ||
      "/placeholder.png";
    const productStock = num(p.stock);
    const inStock = productStock > 0;
    return {
      unitPrice,
      productId: String(p._id),
      productName: p.name || "",
      variantName: null,
      bestImage,
      product: p,
      variant: null,
      chosenVariantId: null,
      productStock,
      variantStock: null,
      inStock,
    };
  }

  // Has variants: choose an in-stock variant (cheapest specialPrice -> mrp)
  const v = await ProductVariant.findOne({
    product: p._id,
    deletedAt: null,
    stock: { $gt: 0 },
  })
    .select(
      "_id variantName mrp specialPrice product productGallery swatchImage stock"
    )
    .sort({ specialPrice: 1, mrp: 1 })
    .lean();

  if (!v) {
    // product exists but no in-stock variants
    return {
      unitPrice: 0,
      productId: String(p._id),
      productName: p.name || "",
      variantName: null,
      bestImage:
        p.heroImage?.path ||
        (Array.isArray(p.productMedia) && p.productMedia[0]?.path) ||
        "/placeholder.png",
      product: p,
      variant: null,
      chosenVariantId: null,
      productStock: num(p.stock),
      variantStock: 0,
      inStock: false,
    };
  }

  const unitPrice = num(v.specialPrice ?? v.mrp);
  const bestImage = pickBestImage(v, p);
  const variantStock = num(v.stock);

  return {
    unitPrice,
    productId: String(p._id),
    productName: p.name || "",
    variantName: v.variantName || "",
    bestImage,
    product: p,
    variant: {
      _id: v._id,
      variantName: v.variantName,
      mrp: v.mrp,
      specialPrice: v.specialPrice ?? null,
      productGallery: v.productGallery || [],
      swatchImage: v.swatchImage || null,
      stock: variantStock,
    },
    chosenVariantId: String(v._id),
    productStock: num(p.stock),
    variantStock,
    inStock: variantStock > 0,
  };
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
    const coupon = await Coupon.findOne({
      code: normCode,
      deletedAt: null,
    }).lean();
    if (!coupon)
      return NextResponse.json(
        { success: false, message: "Invalid coupon code" },
        { status: 404 }
      );

    // totalLimit
    if (
      num(coupon.totalLimit) > 0 &&
      num(coupon.redemptionsTotal) >= num(coupon.totalLimit)
    ) {
      return NextResponse.json(
        { success: false, message: "Coupon redemption limit reached" },
        { status: 400 }
      );
    }

    // perUserLimit
    if (num(coupon.perUserLimit) > 0) {
      if (!userId)
        return NextResponse.json(
          { success: false, message: "Login required for this coupon" },
          { status: 401 }
        );
      const used = await Order.countDocuments({
        userId: String(userId),
        "coupon.code": normCode,
        status: { $nin: ["cancelled", "Invalid Payment"] },
      });
      if (used >= num(coupon.perUserLimit)) {
        return NextResponse.json(
          { success: false, message: "Per-user redemption limit reached" },
          { status: 400 }
        );
      }
    }

    const normItems = items.map((it) => ({
      productId: idStr(it.productId),
      variantId: it.variantId ? idStr(it.variantId) : null,
      qty: Math.max(0, num(it.qty)),
      price: Math.max(0, num(it.price)),
    }));

    const elig = evaluateEligibility(coupon, normItems);
    if (!elig.eligible) {
      return NextResponse.json({
        success: true,
        data: {
          eligible: false,
          reason: elig.reason,
          mode: "ineligible",
          moneyDiscount: {
            applies: false,
            type: null,
            amount: 0,
            applied: 0,
            base: 0,
          },
          freeItem: {
            exists: !!coupon?.freeItem,
            eligible: false,
            productId: null,
            variantId: null,
            qty: 0,
          },
        },
      });
    }

    const { type, amount } = effectiveDiscount(coupon);

    // ===== FREE ITEM: product or variant =====
    const freeProductId = coupon?.freeItem?.product
      ? idStr(coupon.freeItem.product)
      : null;
    const freeVariantId = coupon?.freeItem?.variant
      ? idStr(coupon.freeItem.variant)
      : null;
    const qty = Math.max(1, num(coupon?.freeItem?.qty || 1));

    if (freeVariantId || freeProductId) {
      const meta = freeVariantId
        ? await getVariantBundle(freeVariantId)
        : await getProductBundle(freeProductId);

      if (!meta) {
        return NextResponse.json({
          success: true,
          data: {
            eligible: false,
            reason: "Free item not available",
            mode: "ineligible",
            moneyDiscount: {
              applies: false,
              type: null,
              amount: 0,
              applied: 0,
              base: 0,
            },
            freeItem: {
              exists: true,
              eligible: false,
              productId: freeProductId,
              variantId: freeVariantId,
              qty: 0,
              availableQty: 0,
            },
          },
        });
      }

      if (!meta.inStock) {
        return NextResponse.json({
          success: true,
          data: {
            eligible: false,
            reason: "Free item out of stock",
            mode: "ineligible",
            moneyDiscount: {
              applies: false,
              type: null,
              amount: 0,
              applied: 0,
              base: 0,
            },
            freeItem: {
              exists: true,
              eligible: false,
              productId: meta.productId,
              variantId: meta.chosenVariantId, // could be null if no variants
              qty,
              availableQty: Math.max(
                0,
                meta.variantStock ?? meta.productStock ?? 0
              ),
              productName: meta.productName,
              variantName: meta.variantName,
            },
          },
        });
      }

      const available = meta.variantStock ?? meta.productStock ?? 0;
      if (qty > available) {
        return NextResponse.json({
          success: true,
          data: {
            eligible: false,
            reason: `Only ${available} pcs available for the free item`,
            mode: "ineligible",
            moneyDiscount: {
              applies: false,
              type: null,
              amount: 0,
              applied: 0,
              base: 0,
            },
            freeItem: {
              exists: true,
              eligible: false,
              productId: meta.productId,
              variantId: meta.chosenVariantId,
              qty,
              availableQty: Math.max(0, available),
              productName: meta.productName,
              variantName: meta.variantName,
            },
          },
        });
      }

      const base = meta.unitPrice * qty;

      return NextResponse.json({
        success: true,
        data: {
          eligible: true,
          reason: "Eligible (free item via discount)",
          mode: "freeItem",
          moneyDiscount: {
            applies: true,
            type: "free-item",
            amount: base,
            applied: base,
            base,
          },
          freeItem: {
            exists: true,
            eligible: true,
            requireAddToCart: true,
            // IDs (variant may be null if product has no variants)
            productId: meta.productId,
            variantId: meta.chosenVariantId,
            qty,
            unitPrice: meta.unitPrice,
            availableQty: available,
            // Display/enrichment
            productName: meta.productName,
            variantName: meta.variantName,
            bestImage: meta.bestImage,
            product: meta.product,
            variant: meta.variant,
          },
        },
      });
    }

    // ===== MONEY DISCOUNT =====
    let base = 0;
    for (const it of elig.matchedItems) base += num(it.price) * num(it.qty);

    let applied = 0;
    if (type === "percentage") applied = Math.floor((base * num(amount)) / 100);
    else if (type === "fixed") applied = Math.min(base, num(amount));

    return NextResponse.json({
      success: true,
      data: {
        eligible: true,
        reason: "Eligible (money discount)",
        mode: "money",
        moneyDiscount: {
          applies: applied > 0,
          type,
          amount: num(amount),
          applied,
          base,
        },
        freeItem: {
          exists: false,
          eligible: false,
          productId: null,
          variantId: null,
          qty: 0,
        },
      },
    });
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const msg =
      err?.response?.data?.message || err?.message || "Failed to apply coupon";
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
