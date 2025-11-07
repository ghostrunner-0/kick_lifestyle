// components/application/website/ProductCard.jsx
"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useId,
  useRef,
  useEffect,
} from "react";
import { showToast } from "@/lib/ShowToast";
import Link from "next/link";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { addItem, setQty, selectItems } from "@/store/cartSlice";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShoppingCart } from "lucide-react";
import { PRODUCT_VIEW_ROUTE } from "@/routes/WebsiteRoutes";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";

/* Brand + helpers */
const BRAND = "#fcba17";
const BRAND_HOVER = "#e0a616";
const PLACEHOLDER_SRC = "/placeholder.png";

const toNum = (v) => (typeof v === "string" ? Number(v) : v);
const formatPrice = (value) => {
  const n = toNum(value);
  if (!Number.isFinite(n)) return "";
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

/* detect truncation */
function useIsTruncated() {
  const ref = React.useRef(null);
  const [truncated, setTruncated] = React.useState(false);
  const check = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth);
  }, []);
  React.useEffect(() => {
    check();
    const ro = new ResizeObserver(check);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", check, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [check]);
  return [ref, truncated, check];
}

/* ---- Minimal dots under hero ---- */
function EmblaDots({ api, slidesCount, selectedIndex }) {
  if (!api || slidesCount <= 1) return null;
  return (
    <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 z-20">
      {Array.from({ length: slidesCount }).map((_, i) => {
        const active = i === selectedIndex;
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              api.scrollTo(i);
            }}
            className={[
              "h-[4px] rounded-full transition-all",
              active
                ? "w-4 bg-slate-900/90"
                : "w-2 bg-slate-900/25 hover:bg-slate-900/40",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

/* =================================================================== */

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
    isFeatured: _isFeatured,
    featured: _featured,
    isNew: _isNew,
    new: _newFlag,
  } = product;

  const isFeatured = Boolean(_isFeatured ?? _featured ?? false);
  const isNew = Boolean(_isNew ?? _newFlag ?? false);
  const productHref = PRODUCT_VIEW_ROUTE(slug);
  const cartLines = useSelector(selectItems);

  const [selectedIdx, setSelectedIdx] = useState(variants.length ? 0 : -1);
  const groupId = useId();

  const activeVariant = useMemo(
    () => (selectedIdx >= 0 ? variants[selectedIdx] : null),
    [selectedIdx, variants]
  );

  // keep variant selection valid
  useEffect(() => {
    if (variants.length) {
      if (selectedIdx < 0 || selectedIdx >= variants.length) {
        setSelectedIdx(0);
        onVariantChange?.(variants[0]);
      }
    } else if (selectedIdx !== -1) {
      setSelectedIdx(-1);
      onVariantChange?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, variants]);

  /* ---------- Build gallery ---------- */
  const variantHeroPath =
    activeVariant?.productGallery?.[0]?.path ||
    activeVariant?.swatchImage?.path ||
    null;

  const heroPath =
    variantHeroPath || heroImage?.path || productMedia?.[0]?.path || null;

  const baseGalleryPaths = (productMedia || [])
    .map((m) => m?.path)
    .filter(Boolean);
  const variantGalleryPaths = (activeVariant?.productGallery || [])
    .map((m) => m?.path)
    .filter(Boolean);

  const combined = [
    heroPath,
    ...(variantGalleryPaths.length ? variantGalleryPaths : baseGalleryPaths),
  ];
  const seen = new Set();
  const galleryPaths = combined.filter((p) => {
    if (!p || seen.has(p)) return false;
    seen.add(p);
    return true;
  });
  const gallery = galleryPaths.length ? galleryPaths : [PLACEHOLDER_SRC];

  /* ---------- Pricing ---------- */
  const effMrp = toNum(activeVariant?.mrp ?? mrp);
  const effSp = toNum(activeVariant?.specialPrice ?? specialPrice);
  const off = percentOff(effMrp, effSp);
  const priceNow = off ? effSp : effMrp;
  const priceWas = off ? effMrp : null;

  /* ---------- Stock ---------- */
  const hasVariants = variants.length > 0;
  const needsVariantSelection = hasVariants && !activeVariant;
  const productStock = readStock(product);
  const variantStock = readStock(activeVariant);

  const variantOutOfStock =
    hasVariants && activeVariant && variantStock !== null && variantStock <= 0;
  const productOutOfStock =
    !hasVariants && productStock !== null && productStock <= 0;

  const availableStock = hasVariants ? variantStock : productStock;
  const canAdd =
    !needsVariantSelection && !variantOutOfStock && !productOutOfStock;

  /* ---------- Swatches ---------- */
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
      selectVariant((selectedIdx + 1) % swatches.length);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      selectVariant((selectedIdx - 1 + swatches.length) % swatches.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectVariant(0);
    } else if (e.key === "End") {
      e.preventDefault();
      selectVariant(swatches.length - 1);
    }
  };

  /* ---------- Cart helpers ---------- */
  const buildCartPayload = (qtyDelta = 1) => ({
    productId: _id,
    slug,
    name,
    qty: qtyDelta,
    price: priceNow,
    mrp: effMrp,
    image: gallery[0],
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
  });

  const cartLine = useMemo(() => {
    const match = (it) => {
      if (it.productId !== _id) return false;
      if (!activeVariant) return !it.variant;
      const itVarId = it.variant?.id || it.variant?._id;
      const itSku = it.variant?.sku;
      return (
        itVarId === activeVariant._id ||
        (activeVariant.sku && itSku === activeVariant.sku)
      );
    };
    return cartLines.find(match) || null;
  }, [cartLines, _id, activeVariant?._id, activeVariant?.sku]);

  const currentQty = Number(cartLine?.qty ?? 0) || 0;
  const reachedLimit =
    availableStock !== null && currentQty >= Number(availableStock);
  const nextWouldExceed =
    availableStock !== null && currentQty + 1 > Number(availableStock);
  const subtotal = Number(priceNow || 0) * currentQty;

  const handleAddToCart = () => {
    if (needsVariantSelection) {
      showToast("info", "Please select a color first.");
      try {
        swatchGroupRef.current?.focus();
        swatchGroupRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } catch {}
      return;
    }
    if (variantOutOfStock) {
      showToast("warning", "Selected variant is out of stock.");
      return;
    }
    if (productOutOfStock) {
      showToast("warning", "This product is out of stock.");
      return;
    }
    if (nextWouldExceed) {
      showToast(
        "warning",
        `Only ${availableStock} in stock. You can’t add more.`
      );
      return;
    }

    const payload = buildCartPayload(1);
    dispatch(addItem(payload));
    onAddToCart?.(payload);
    showToast(
      "success",
      `${name}${
        activeVariant ? ` — ${activeVariant.variantName}` : ""
      } added to cart.`
    );
  };

  const handleIncrement = () => {
    if (!canAdd) return;
    if (nextWouldExceed) {
      showToast(
        "warning",
        `Only ${availableStock} in stock. You can’t add more.`
      );
      return;
    }
    dispatch(addItem(buildCartPayload(1)));
  };

  const handleDecrement = () => {
    if (currentQty <= 0) return;
    const next = currentQty - 1;
    dispatch(
      setQty({
        productId: _id,
        variant: activeVariant
          ? { id: activeVariant._id, sku: activeVariant.sku }
          : null,
        qty: next,
      })
    );
  };

  const buttonLabel = needsVariantSelection
    ? "Select Color"
    : variantOutOfStock || productOutOfStock
    ? "Out of Stock"
    : "Add To Cart";

  /* ---------- Embla setup ---------- */
  const galleryKey = activeVariant?._id || slug || "base";
  const [emblaViewportRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    containScroll: "trimSnaps",
    dragFree: false,
    slidesToScroll: 1,
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedImageIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const onSlideLinkClick = useCallback(
    (e) => {
      if (emblaApi && !emblaApi.clickAllowed()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [emblaApi]
  );

  const [nameRef2] = useIsTruncated();

  /* ---------- Card UI ---------- */
  return (
    <motion.div
      whileHover={{
        y: -3,
        boxShadow: "0 18px 45px rgba(15,23,42,0.16)",
      }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={[
        "group relative flex flex-col w-full",
        "rounded-2xl sm:rounded-3xl bg-white",
        "border border-slate-100 shadow-[0_10px_26px_rgba(15,23,42,0.06)]",
        "dark:bg-neutral-950 dark:border-neutral-800",
        "overflow-hidden transition-all duration-200",
        className,
      ].join(" ")}
    >
      {/* ---------- MEDIA ---------- */}
      <div
        className="relative w-full"
        style={{
          backgroundImage: `
            radial-gradient(720px 380px at 50% -18%, rgba(252,186,23,0.22), rgba(252,186,23,0) 82%),
            radial-gradient(460px 280px at -8% -10%, rgba(252,186,23,0.14), rgba(252,186,23,0) 72%),
            radial-gradient(460px 280px at 108% -10%, rgba(252,186,23,0.14), rgba(252,186,23,0) 72%),
            linear-gradient(180deg, #ffffff 0%, #fff8e6 40%, #ffffff 100%)
          `,
        }}
      >
        {/* Slightly shorter to avoid super tall cards in 2-col mobile */}
        <div className="relative w-full aspect-[4/4.6] sm:aspect-[4/3.4]">
          <div className="absolute inset-0">
            {/* badges */}
            <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1.5">
              {off !== null && (
                <Badge className="px-2.5 py-0.5 text-[9px] font-semibold rounded-full bg-black text-white">
                  {off}% OFF
                </Badge>
              )}
              {isNew && (
                <Badge className="px-2 py-0.5 text-[8px] font-semibold rounded-full bg-white text-black shadow-sm">
                  NEW
                </Badge>
              )}
              {isFeatured && (
                <Badge className="px-2 py-0.5 text-[8px] font-medium rounded-full bg-black/85 text-white shadow-sm">
                  Featured
                </Badge>
              )}
            </div>

            {/* gallery */}
            <div className="absolute inset-0">
              <div className="embla h-full" aria-label="Product images">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={galleryKey}
                    ref={emblaViewportRef}
                    className="embla__viewport h-full"
                    style={{ touchAction: "pan-y" }}
                    initial={{ opacity: 0.5, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.99 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="embla__container h-full">
                      {gallery.map((src, idx) => (
                        <div
                          key={`${src}-${idx}`}
                          className="embla__slide relative h-full"
                        >
                          {productHref ? (
                            <Link
                              href={productHref}
                              aria-label={
                                name ? `View ${name}` : "View product"
                              }
                              className="absolute inset-0 block"
                              onClick={onSlideLinkClick}
                              draggable={false}
                            >
                              <Image
                                src={src}
                                alt={
                                  name
                                    ? `${name} — image ${idx + 1}`
                                    : `Product image ${idx + 1}`
                                }
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-contain p-4 sm:p-5 transition-transform duration-300 group-hover:scale-[1.04]"
                                priority={idx === 0}
                                draggable={false}
                              />
                            </Link>
                          ) : (
                            <Image
                              src={src}
                              alt={
                                name
                                  ? `${name} — image ${idx + 1}`
                                  : `Product image ${idx + 1}`
                              }
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              className="object-contain p-4 sm:p-5"
                              priority={idx === 0}
                              draggable={false}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <EmblaDots
                  api={emblaApi}
                  slidesCount={gallery.length}
                  selectedIndex={selectedImageIndex}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- CONTENT ---------- */}
      <div className="flex flex-col flex-1 px-3.5 py-3 gap-2">
        {/* Title + swatches */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {productHref ? (
              <Link
                href={productHref}
                aria-label={name ? `View ${name}` : "View product"}
                className="block"
              >
                <span
                  ref={nameRef2}
                  className="block font-semibold text-[14px] sm:text-[16px] text-slate-900 dark:text-slate-50 leading-snug truncate group-hover:text-slate-950"
                >
                  {name}
                </span>
              </Link>
            ) : (
              <span
                ref={nameRef2}
                className="block font-semibold text-[14px] sm:text-[16px] text-slate-900 dark:text-slate-50 leading-snug truncate"
              >
                {name}
              </span>
            )}
          </div>

          {variants.length > 0 && (
            <ScrollArea
              className="shrink-0 max-w-[42%] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]"
              aria-label="Choose variant"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div
                id={groupId}
                role="radiogroup"
                aria-label="Choose variant"
                aria-activedescendant={
                  selectedIdx >= 0 ? `${groupId}-opt-${selectedIdx}` : undefined
                }
                className="flex items-center gap-1.5 py-0.5"
                onKeyDown={onVariantKeyDown}
                ref={swatchGroupRef}
                tabIndex={-1}
              >
                <TooltipProvider delayDuration={120}>
                  {swatches.map((s, i) => {
                    const selected = i === selectedIdx;
                    const title = s.name || "Variant";
                    return (
                      <Tooltip key={s.key}>
                        <TooltipTrigger asChild>
                          <button
                            id={`${groupId}-opt-${i}`}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            tabIndex={
                              selectedIdx === -1
                                ? i === 0
                                  ? 0
                                  : -1
                                : selected
                                ? 0
                                : -1
                            }
                            onClick={() => selectVariant(i)}
                            className={[
                              "relative h-6 w-6 shrink-0 rounded-full overflow-hidden border bg-white",
                              "dark:bg-neutral-900 dark:border-neutral-700",
                              "transition-all duration-150",
                              selected
                                ? "border-[2px] border-[#fcba17] shadow-[0_0_0_2px_rgba(252,186,23,0.18)]"
                                : "border-slate-300 hover:border-slate-400",
                            ].join(" ")}
                          >
                            {s.img ? (
                              <Image
                                src={s.img}
                                alt={title}
                                fill
                                sizes="24px"
                                className="object-cover"
                                draggable={false}
                              />
                            ) : (
                              <div className="h-full w-full bg-slate-200" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="px-2 py-1 text-[10px] leading-tight">
                          {title}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Price row */}
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[17px] sm:text-[19px] font-semibold text-slate-900 dark:text-slate-50">
                {formatPrice(priceNow)}
              </span>
              {/* Desktop: inline MRP */}
              <span className="hidden sm:inline text-[11px] text-slate-500 line-through">
                {priceWas
                  ? `MRP ${formatPrice(priceWas)}`
                  : `MRP ${formatPrice(effMrp)}`}
              </span>
            </div>
            {/* Mobile: MRP on its own line */}
            <span className="block sm:hidden text-[11px] text-slate-500 line-through mt-0.5">
              {priceWas
                ? `MRP ${formatPrice(priceWas)}`
                : `MRP ${formatPrice(effMrp)}`}
            </span>
          </div>

          {/* Save % — desktop only */}
          {off && (
            <span className="hidden sm:inline text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Save {off}%
            </span>
          )}
        </div>

        {/* CTA / Quantity */}
        <div className="mt-1.5">
          {currentQty > 0 ? (
            <div className="flex items-center justify-between gap-3">
              {/* Stepper */}
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={currentQty <= 0}
                  aria-label="Decrease quantity"
                  className={[
                    "h-7 w-7 flex items-center justify-center rounded-md border text-[16px]",
                    "border-slate-200 bg-white text-slate-800",
                    "hover:bg-slate-50 active:scale-[0.97]",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fcba17]",
                    "dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100",
                  ].join(" ")}
                >
                  –
                </button>
                <div
                  aria-live="polite"
                  className="min-w-[1.5ch] text-center text-[14px] font-semibold text-slate-900 dark:text-slate-50"
                >
                  {currentQty}
                </div>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={!canAdd || reachedLimit}
                  aria-label="Increase quantity"
                  className={[
                    "h-7 w-7 flex items-center justify-center rounded-md border text-[16px]",
                    "border-slate-200 bg-white text-slate-800",
                    "hover:bg-slate-50 active:scale-[0.97]",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fcba17]",
                    "dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100",
                  ].join(" ")}
                  title={
                    !canAdd
                      ? "Out of stock"
                      : reachedLimit && availableStock !== null
                      ? `Max ${availableStock} in stock`
                      : "Increase quantity"
                  }
                >
                  +
                </button>
              </div>

              {/* Subtotal on md+ */}
              <div className="hidden sm:inline-flex flex-col items-end leading-tight">
                <span className="text-[9px] text-slate-500">Subtotal</span>
                <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-50">
                  {formatPrice(subtotal)}
                </span>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              disabled={!canAdd}
              onClick={handleAddToCart}
              className={[
                "w-full inline-flex items-center justify-center gap-1.5",
                "rounded-full px-3 py-2 text-[12px] sm:text-[13px] font-semibold tracking-wide",
                "text-slate-950 shadow-sm hover:shadow-md",
                "transition-all duration-180",
                "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#fcba17]",
                "disabled:opacity-55 disabled:cursor-not-allowed",
              ].join(" ")}
              style={{ backgroundColor: canAdd ? BRAND : "#e5e7eb" }}
              onMouseEnter={(e) => {
                if (canAdd) e.currentTarget.style.backgroundColor = BRAND_HOVER;
              }}
              onMouseLeave={(e) => {
                if (canAdd) e.currentTarget.style.backgroundColor = BRAND;
              }}
              aria-disabled={!canAdd}
              aria-label={`Add ${name || "product"} to cart`}
              title={canAdd ? "Add to cart" : "Out of stock"}
            >
              <ShoppingCart className="h-4 w-4" />
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Embla base styles */}
      <style jsx global>{`
        .embla {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
        .embla__viewport {
          width: 100%;
          height: 100%;
        }
        .embla__container {
          display: flex;
          height: 100%;
        }
        .embla__slide {
          flex: 0 0 100%;
          min-width: 0;
          height: 100%;
        }
      `}</style>
    </motion.div>
  );
}
