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
const BRAND_HOVER = "#e9ae12";
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

// Normalize stock from common fields
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
  const cartLines = useSelector(selectItems);

  const [selectedIdx, setSelectedIdx] = useState(() =>
    variants.length ? 0 : -1
  );
  const groupId = useId();

  const activeVariant = useMemo(
    () => (selectedIdx >= 0 ? variants[selectedIdx] : null),
    [selectedIdx, variants]
  );

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

  // --- Build gallery
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

  // Pricing
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
  const variantOutOfStock =
    hasVariants && activeVariant && variantStock !== null && variantStock <= 0;
  const productOutOfStock =
    !hasVariants && productStock !== null && productStock <= 0;
  const canAdd =
    !needsVariantSelection && !variantOutOfStock && !productOutOfStock;

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

  // Cart helpers
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
      showToast("warning", "Selected color is out of stock.");
      return;
    }
    if (productOutOfStock) {
      showToast("warning", "This product is out of stock.");
      return;
    }

    dispatch(addItem(buildCartPayload(1)));
    onAddToCart?.(buildCartPayload(1));
    showToast(
      "success",
      `${name}${
        activeVariant ? ` — ${activeVariant.variantName}` : ""
      } added to cart.`
    );
  };

  const handleIncrement = () => {
    if (!canAdd) return;
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

  /* ==================== EMBLA: swipe works on mobile ==================== */
  const galleryKey = activeVariant?._id || slug || "base";
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: gallery.length > 1,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  // progress bar
  const [scrollProgress, setScrollProgress] = useState(0);
  const onScroll = useCallback(() => {
    if (!emblaApi) return;
    const p = emblaApi.scrollProgress();
    setScrollProgress(Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onScroll();
    emblaApi.on("scroll", onScroll);
    emblaApi.on("reInit", onScroll);
    return () => {
      emblaApi.off("scroll", onScroll);
      emblaApi.off("reInit", onScroll);
    };
  }, [emblaApi, onScroll]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
      emblaApi.scrollTo(0, true);
    }
  }, [emblaApi, galleryKey, gallery.length]);

  // prevent click-through after a swipe
  const handleSlideLinkClick = (e) => {
    if (emblaApi && !emblaApi.clickAllowed()) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={[
        "group relative overflow-hidden rounded-2xl bg-white",
        "border border-slate-200/70 shadow-sm transition-all",
        "dark:bg-neutral-900 dark:border-neutral-800",
        className,
      ].join(" ")}
    >
      {/* Media — gradient backdrop */}
      <div
        className="relative aspect-square md:aspect-[4/5]"
        style={{
          backgroundImage: `
            radial-gradient(820px 520px at 50% -18%, rgba(252,186,23,0.72), rgba(252,186,23,0) 82%),
            radial-gradient(680px 420px at -12% -14%, rgba(252,186,23,0.45), rgba(252,186,23,0) 76%),
            radial-gradient(680px 420px at 112% -14%, rgba(252,186,23,0.45), rgba(252,186,23,0) 76%),
            radial-gradient(640px 400px at 50% 110%, rgba(252,186,23,0.28), rgba(252,186,23,0) 78%),
            radial-gradient(420px 260px at 6% 102%, rgba(252,186,23,0.22), rgba(252,186,23,0) 64%),
            radial-gradient(420px 260px at 94% 102%, rgba(252,186,23,0.22), rgba(252,186,23,0) 64%),
            linear-gradient(180deg, rgba(252,186,23,0.32) 0%, rgba(252,186,23,0.18) 44%, #ffffff 86%)
          `,
        }}
      >
        {/* Discount badge */}
        {off !== null && (
          <div className="absolute right-3 top-3 z-20">
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
          <div className="absolute left-3 top-3 z-20">
            <span className="rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-bold text-white shadow">
              Out of stock
            </span>
          </div>
        )}

        {/* Slider */}
        <div className="absolute inset-0">
          <div className="embla h-full" aria-label="Product images">
            <AnimatePresence mode="wait">
              <motion.div
                key={galleryKey}
                className="embla__viewport h-full"
                ref={emblaRef}
                /* ✨ important for mobile swipe */
                style={{ touchAction: "pan-y" }}
                initial={{ opacity: 0.2, scale: 0.995 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.995 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
              >
                <div className="embla__container flex h-full">
                  {gallery.map((src, idx) => (
                    <div
                      key={`${src}-${idx}`}
                      className="embla__slide relative h-full min-w-0 flex-[0_0_100%] select-none"
                    >
                      {productHref ? (
                        <Link
                          href={productHref}
                          aria-label={name ? `View ${name}` : "View product"}
                          className="absolute inset-0 block"
                          onClick={handleSlideLinkClick}
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
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 33vw"
                            className="object-contain md:scale-[1.06]"
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
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-contain"
                          priority={idx === 0}
                          draggable={false}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {gallery.length > 1 && (
              <div className="absolute bottom-1 left-3 right-3 z-20 h-1 rounded-full bg-black/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-black/40 origin-left"
                  animate={{ scaleX: scrollProgress || 0.0001 }}
                  initial={false}
                  transition={{ type: "spring", stiffness: 220, damping: 28 }}
                  style={{ transformOrigin: "left" }}
                  aria-hidden
                />
              </div>
            )}
          </div>
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
            <ScrollArea
              className="shrink-0 max-w-[50%] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] me-0.5"
              aria-label="Choose color"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div
                id={groupId}
                role="radiogroup"
                aria-label="Choose a color"
                aria-activedescendant={
                  selectedIdx >= 0 ? `${groupId}-opt-${selectedIdx}` : undefined
                }
                className="flex items-center gap-2 py-0.75 px-1"
                onKeyDown={onVariantKeyDown}
                ref={swatchGroupRef}
                tabIndex={-1}
              >
                <TooltipProvider delayDuration={200}>
                  {swatches.map((s) => {
                    const selected = s.index === selectedIdx;
                    return (
                      <Tooltip key={s.key}>
                        <TooltipTrigger asChild>
                          <motion.button
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
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            className={[
                              "relative h-7 w-7 shrink-0 overflow-hidden rounded-full outline-none",
                              "transition-all focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-[#fcba17] focus-visible:ring-offset-white",
                              "dark:focus-visible:ring-offset-neutral-900",
                              "bg-white dark:bg-neutral-900",
                              selected
                                ? "border-2 border-[#fcba17] shadow-[0_0_0_3px_rgba(252,186,23,0.20)]"
                                : "border border-black/10",
                            ].join(" ")}
                          >
                            {s.img ? (
                              <Image
                                src={s.img}
                                alt={s.name || "variant"}
                                fill
                                sizes="28px"
                                className="object-cover"
                                draggable={false}
                              />
                            ) : (
                              <div className="h-full w-full bg-slate-200 dark:bg-neutral-700" />
                            )}
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="px-2 py-1 text-xs">
                          {s.name}
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
        <motion.div
          key={`${priceNow}-${priceWas ?? "na"}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="mt-2 flex items-baseline justify-between"
        >
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
        </motion.div>

        {/* CTA — minimal stepper + subtotal */}
        <div className="mt-2">
          {currentQty > 0 ? (
            <motion.div
              key="qty-ui"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="flex items-center justify-between gap-3"
            >
              {/* Stepper */}
              <div className="inline-flex items-center gap-1.5">
                <motion.button
                  type="button"
                  onClick={handleDecrement}
                  disabled={currentQty <= 0}
                  aria-label="Decrease quantity"
                  whileTap={{ scale: 0.95 }}
                  className={[
                    "h-7 w-7 rounded-md border text-[16px] leading-none",
                    "border-slate-200 bg-white text-slate-700 shadow-sm",
                    "hover:bg-slate-50 active:scale-[0.98]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
                    "focus-visible:ring-[#fcba17] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100",
                  ].join(" ")}
                >
                  –
                </motion.button>

                <div
                  aria-live="polite"
                  className="min-w-[1.5ch] text-center text-sm font-semibold text-slate-900 dark:text-white"
                >
                  {currentQty}
                </div>

                <motion.button
                  type="button"
                  onClick={handleIncrement}
                  disabled={!canAdd}
                  aria-label="Increase quantity"
                  whileTap={{ scale: 0.95 }}
                  className={[
                    "h-7 w-7 rounded-md border text-[16px] leading-none",
                    "border-slate-200 bg-white text-slate-700 shadow-sm",
                    "hover:bg-slate-50 active:scale-[0.98]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
                    "focus-visible:ring-[#fcba17] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100",
                  ].join(" ")}
                  title={canAdd ? "Increase quantity" : "Out of stock"}
                >
                  +
                </motion.button>
              </div>

              {/* Subtotal */}
              <div className="inline-flex items-baseline gap-2 leading-tight">
                <span className="text-[10px] font-medium text-slate-500 dark:text-neutral-400">
                  Subtotal
                </span>
                <motion.span
                  key={subtotal}
                  initial={{ opacity: 0.6, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white"
                  aria-live="polite"
                >
                  {formatPrice(subtotal)}
                </motion.span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="add-btn"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              <Button
                type="button"
                disabled={!canAdd}
                className={[
                  "w-full rounded-full px-3 py-1.5 text-[11px] font-bold text-white transition-colors",
                  "min-h-[34px]",
                  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#fcba17]",
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
                <ShoppingCart className="mr-2 h-3.5 w-3.5" />
                {buttonLabel}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
