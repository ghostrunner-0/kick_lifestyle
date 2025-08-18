// components/application/website/ProductCard.jsx
"use client";

import React, { useMemo, useState, useCallback, useId, useRef } from "react";
import { showToast } from "@/lib/ShowToast";
import Link from "next/link";
import Image from "next/image";
import { useDispatch } from "react-redux";
import { addItem } from "@/store/cartSlice";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShoppingCart } from "lucide-react";
import { PRODUCT_VIEW_ROUTE } from "@/routes/WebsiteRoutes";

/* Brand + helpers */
const BRAND = "#fcba17";
const BRAND_HOVER = "#e9ae12";

const toNum = (v) => (typeof v === "string" ? Number(v) : v);

const formatPrice = (value) => {
  const n = toNum(value);
  if (typeof n !== "number" || Number.isNaN(n)) return "";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rs.${Number(n || 0).toLocaleString("en-IN")}`;
  }
};

const percentOff = (mrp, sp) => {
  const m = toNum(mrp);
  const s = toNum(sp);
  return Number.isFinite(m) && Number.isFinite(s) && s < m
    ? Math.round(((m - s) / m) * 100)
    : null;
};

// Try common stock fields and normalize to a number or null (unknown)
const readStock = (obj) => {
  if (!obj) return null;
  const raw =
    obj.stock ??
    obj.quantity ??
    obj.qty ??
    obj.inventory ??
    obj.availableQty ??
    null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/**
 * Props:
 * - product
 * - className?: string
 * - onAddToCart?: (payload) => void
 * - onVariantChange?: (variant|null) => void
 */
export default function ProductCard({
  product,
  className = "",
  onAddToCart,
  onVariantChange,
}) {
  const dispatch = useDispatch();
  const swatchGroupRef = useRef(null);

  if (!product) return null;

  const {
    _id,
    slug,
    name,
    mrp,
    specialPrice,
    heroImage,
    productMedia,
    variants = [],
  } = product;

  const productHref = PRODUCT_VIEW_ROUTE(slug);

  const [selectedIdx, setSelectedIdx] = useState(-1);
  const groupId = useId();

  const activeVariant = useMemo(
    () => (selectedIdx >= 0 ? variants[selectedIdx] : null),
    [selectedIdx, variants]
  );

  // Image (hero first; only change after variant select)
  const primaryImage =
    (activeVariant &&
      (activeVariant.productGallery?.[0]?.path ||
        activeVariant.swatchImage?.path)) ||
    heroImage?.path ||
    productMedia?.[0]?.path ||
    "/placeholder.png";

  // Pricing (variant overrides only after select)
  const effMrp = toNum(activeVariant?.mrp ?? mrp);
  const effSp = toNum(activeVariant?.specialPrice ?? specialPrice);
  const off = percentOff(effMrp, effSp);
  const priceNow = off ? effSp : effMrp;
  const priceWas = off ? effMrp : null;

  // Stock guards
  const hasVariants = variants.length > 0;
  const needsVariantSelection = hasVariants && !activeVariant;

  const productStock = readStock(product);
  const variantStock = readStock(activeVariant);

  // Only mark out of stock when we positively know stock is 0 or less.
  const variantOutOfStock = hasVariants && activeVariant && variantStock !== null && variantStock <= 0;
  const productOutOfStock = !hasVariants && productStock !== null && productStock <= 0;

  const canAdd = !needsVariantSelection && !variantOutOfStock && !productOutOfStock;

  // Swatches
  const swatches = variants.map((v, i) => ({
    key: v?._id || v?.sku || `${v?.variantName || "variant"}-${i}`,
    img: v?.swatchImage?.path || v?.productGallery?.[0]?.path || null,
    name: v?.variantName || "Variant",
    index: i,
  }));

  const selectVariant = useCallback(
    (idx) => {
      setSelectedIdx(idx);
      onVariantChange?.(idx >= 0 ? variants[idx] : null);
    },
    [variants, onVariantChange]
  );

  const onVariantKeyDown = (e) => {
    if (!swatches.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (selectedIdx + 1) % swatches.length;
      selectVariant(next);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (selectedIdx - 1 + swatches.length) % swatches.length;
      selectVariant(prev);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectVariant(0);
    } else if (e.key === "End") {
      e.preventDefault();
      selectVariant(swatches.length - 1);
    }
  };

  const handleAddToCart = () => {
    // 1) Require variant selection
    if (needsVariantSelection) {
      showToast("info", "Please select a color first.");
      try {
        swatchGroupRef.current?.focus();
        swatchGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {}
      return;
    }

    // 2) Guard stock
    if (variantOutOfStock) {
      showToast("warning", "Selected color is out of stock.");
      return;
    }
    if (productOutOfStock) {
      showToast("warning", "This product is out of stock.");
      return;
    }

    const payload = {
      productId: _id,
      slug,
      name,
      qty: 1,
      price: priceNow,
      mrp: effMrp,
      image: primaryImage, // variant image if selected, else hero/product image
      variant: activeVariant
        ? {
            id: activeVariant._id,
            sku: activeVariant.sku,
            name: activeVariant.variantName,
            image:
              activeVariant.productGallery?.[0]?.path ||
              activeVariant.swatchImage?.path ||
              null,
          }
        : null,
    };

    dispatch(addItem(payload));
    showToast(
      "success",
      `${name}${activeVariant ? ` — ${activeVariant.variantName}` : ""} added to cart.`
    );
    onAddToCart?.(payload);
  };

  const buttonLabel = needsVariantSelection
    ? "Select Color"
    : variantOutOfStock || productOutOfStock
    ? "Out of Stock"
    : "Add To Cart";

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl bg-white",
        "border border-slate-200/70 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg",
        "dark:bg-neutral-900 dark:border-neutral-800",
        className,
      ].join(" ")}
    >
      {/* Media — top glow + subtle bottom glow */}
      <div
        className="relative aspect-square md:aspect-[4/5]"
        style={{
          backgroundImage: `
            radial-gradient(640px 420px at 50% -16%, rgba(252,186,23,0.46), rgba(252,186,23,0) 72%),
            radial-gradient(480px 300px at -10% -12%, rgba(252,186,23,0.26), rgba(252,186,23,0) 66%),
            radial-gradient(480px 300px at 110% -12%, rgba(252,186,23,0.26), rgba(252,186,23,0) 66%),
            radial-gradient(500px 320px at 50% 106%, rgba(252,186,23,0.16), rgba(252,186,23,0) 70%),
            radial-gradient(320px 200px at 8% 100%, rgba(252,186,23,0.10), rgba(252,186,23,0) 58%),
            radial-gradient(320px 200px at 92% 100%, rgba(252,186,23,0.10), rgba(252,186,23,0) 58%),
            linear-gradient(180deg, rgba(252,186,23,0.20) 0%, rgba(252,186,23,0.10) 40%, #ffffff 80%)
          `,
        }}
      >
        {/* Discount badge */}
        {off !== null && (
          <div className="absolute right-3 top-3 z-10">
            <Badge
              variant="outline"
              className="rounded-full bg-white text-black border border-black/10 shadow-sm px-2.5 py-1 text-[11px] font-extrabold leading-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#fcba17]/40"
              aria-label={`${off}% OFF`}
            >
              {off}% OFF
            </Badge>
          </div>
        )}

        {/* OOS badge */}
        {(variantOutOfStock || productOutOfStock) && (
          <div className="absolute left-3 top-3 z-10">
            <span className="rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-bold text-white shadow">
              Out of stock
            </span>
          </div>
        )}

        {/* Image -> Link to product details */}
        <div className="absolute inset-0">
          {productHref ? (
            <Link
              href={productHref}
              aria-label={name ? `View ${name}` : "View product"}
              className="absolute inset-0 block"
            >
              <Image
                src={primaryImage}
                alt={name || "Product"}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-contain"
                priority={false}
              />
            </Link>
          ) : (
            <Image
              src={primaryImage}
              alt={name || "Product"}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-contain"
              priority={false}
            />
          )}
        </div>
      </div>

      {/* INFO */}
      <div className="p-3 sm:p-4">
        {/* Title + Variants */}
        <div className="mb-1 flex items-start gap-3">
          <h3 className="flex-1 line-clamp-2 text-[15px] font-medium text-slate-900 dark:text-white">
            {productHref ? (
              <Link
                href={productHref}
                className="hover:underline underline-offset-2"
                aria-label={name ? `View ${name}` : "View product"}
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </h3>

          {swatches.length > 0 && (
            <ScrollArea className="shrink-0 max-w-[48%]">
              <div
                id={groupId}
                role="radiogroup"
                aria-label="Choose a color"
                aria-activedescendant={
                  selectedIdx >= 0 ? `${groupId}-opt-${selectedIdx}` : undefined
                }
                className="flex items-center gap-2"
                onKeyDown={onVariantKeyDown}
                ref={swatchGroupRef}
                tabIndex={-1} // focusable programmatically
              >
                <TooltipProvider delayDuration={200}>
                  {swatches.map((s) => {
                    const selected = s.index === selectedIdx;
                    return (
                      <Tooltip key={s.key}>
                        <TooltipTrigger asChild>
                          <button
                            id={`${groupId}-opt-${s.index}`}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            tabIndex={
                              selectedIdx === -1
                                ? s.index === 0
                                  ? 0
                                  : -1
                                : selected
                                ? 0
                                : -1
                            }
                            onClick={() => selectVariant(s.index)}
                            title={s.name}
                            className={[
                              "relative h-7 w-7 shrink-0 overflow-hidden rounded-full outline-none",
                              "transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#fcba17] focus-visible:ring-offset-white",
                              "dark:focus-visible:ring-offset-neutral-900",
                            ].join(" ")}
                            style={{
                              border: selected
                                ? `2px solid ${BRAND}`
                                : "1px solid rgba(0,0,0,0.08)",
                              boxShadow: selected
                                ? `0 0 0 3px rgba(252,186,23,0.20)`
                                : "none",
                              backgroundColor: "#fff",
                            }}
                          >
                            {s.img ? (
                              <Image
                                src={s.img}
                                alt={s.name || "variant"}
                                fill
                                sizes="28px"
                                className="object-cover"
                                priority={false}
                              />
                            ) : (
                              <div className="h-full w-full bg-slate-200 dark:bg-neutral-700" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="px-2 py-1 text-xs">
                          {s.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </div>

        {/* Price row */}
        <div className="mt-2 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-white">
              {formatPrice(priceNow)}
            </span>
            {priceWas ? (
              <span className="text-[12px] text-slate-500 line-through">
                MRP {formatPrice(priceWas)}
              </span>
            ) : (
              <span className="text-[12px] text-slate-500">
                MRP {formatPrice(effMrp)}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3">
          <Button
            type="button"
            disabled={!canAdd}
            className={[
              "w-full rounded-full px-4 py-2 text-[12px] font-bold text-white transition-colors",
              needsVariantSelection ? "ring-1 ring-amber-300" : "",
              !canAdd ? "opacity-70 cursor-not-allowed" : "",
            ].join(" ")}
            style={{ backgroundColor: BRAND }}
            onMouseEnter={(e) => {
              if (canAdd) e.currentTarget.style.backgroundColor = BRAND_HOVER;
            }}
            onMouseLeave={(e) => {
              if (canAdd) e.currentTarget.style.backgroundColor = BRAND;
            }}
            onClick={handleAddToCart}
            aria-disabled={!canAdd}
            aria-label={
              needsVariantSelection
                ? "Select a color first"
                : !canAdd
                ? "Out of stock"
                : `Add ${name || "product"} to cart`
            }
            title={
              needsVariantSelection
                ? "Select a color first"
                : !canAdd
                ? "Out of stock"
                : "Add to cart"
            }
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
