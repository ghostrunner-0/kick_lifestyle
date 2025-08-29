"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";

/* store */
import { addItem, setQty, removeItem, selectItemsMap } from "@/store/cartSlice";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* icons */
import { ShoppingCart } from "lucide-react";

/* --- helpers --- */
const api = axios.create({ baseURL: "/", withCredentials: true });

const toNum = (v) => (typeof v === "string" ? Number(v) : v);
const money = (n) => {
  const v = toNum(n);
  if (!Number.isFinite(v)) return "";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `Rs. ${Number(v || 0).toLocaleString("en-IN")}`;
  }
};
const percentOff = (mrp, sp) => {
  const m = toNum(mrp);
  const s = toNum(sp);
  return Number.isFinite(m) && Number.isFinite(s) && s < m
    ? Math.round(((m - s) / m) * 100)
    : null;
};
const inferInStock = (p) => {
  if (typeof p?.inStock === "boolean") return p.inStock;
  if (Number.isFinite(p?.stock)) return p.stock > 0;
  if (Number.isFinite(p?.inventory)) return p.inventory > 0;
  if (Number.isFinite(p?.quantity)) return p.quantity > 0;
  if (Array.isArray(p?.variants)) {
    return p.variants.some((v) =>
      typeof v?.inStock === "boolean"
        ? v.inStock
        : Number.isFinite(v?.stock)
        ? v.stock > 0
        : false
    );
  }
  return true;
};
const getVariantHero = (v, fallback) =>
  v?.heroImage?.path ||
  v?.productGallery?.[0]?.path ||
  v?.swatchImage?.path ||
  fallback ||
  "";

/* Qty control used in card + sticky */
const QtyControl = ({
  qty = 0,
  onDec,
  onInc,
  size = "md", // "sm" (sticky) | "md" (main)
  className = "",
}) => {
  const h = size === "sm" ? "h-9" : "h-12";
  const cols =
    size === "sm" ? "grid-cols-[38px_1fr_38px]" : "grid-cols-[48px_1fr_48px]";
  return (
    <div
      className={`grid ${cols} w-full rounded-xl border bg-background overflow-hidden ${className}`}
    >
      <button
        type="button"
        className={`${h} grid place-items-center text-lg font-semibold`}
        onClick={onDec}
        aria-label="Decrease quantity"
      >
        –
      </button>
      <div
        className={`${h} grid place-items-center text-base font-medium select-none tabular-nums`}
      >
        {qty}
      </div>
      <button
        type="button"
        className={`${h} grid place-items-center text-lg font-semibold`}
        onClick={onInc}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
};

/* ===================== PAGE ===================== */
export default function ProductPageClient({ initialProduct }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const product = initialProduct || null;
  const slug = product?.slug || product?.data?.slug || "";

  // rating summary
  const [ratingSummary, setRatingSummary] = useState({
    average: 0,
    total: 0,
    loaded: false,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!product?._id) return;
      try {
        const { data } = await api.get("/api/website/reviews/summary", {
          params: { productId: product._id },
        });
        if (!cancelled && data?.success) {
          const avg = Number(data.data?.average || 0);
          const total = Number(data.data?.total || 0);
          setRatingSummary({ average: avg, total, loaded: true });
        }
      } catch {
        if (!cancelled) setRatingSummary((s) => ({ ...s, loaded: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product?._id]);

  // variants & pricing
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const [selectedIdx, setSelectedIdx] = useState(variants.length > 0 ? 0 : -1);
  useEffect(() => {
    if (
      variants.length > 0 &&
      (selectedIdx < 0 || selectedIdx >= variants.length)
    ) {
      setSelectedIdx(0);
    }
  }, [variants, selectedIdx]);
  const activeVariant = useMemo(
    () => (selectedIdx >= 0 ? variants[selectedIdx] : null),
    [selectedIdx, variants]
  );

  const gallery = useMemo(() => {
    if (activeVariant?.productGallery?.length)
      return activeVariant.productGallery;
    const base = [];
    if (product?.heroImage?.path) base.push(product.heroImage);
    if (Array.isArray(product?.productMedia))
      base.push(...product.productMedia);
    return base;
  }, [product, activeVariant]);

  const heroSrc =
    product?.heroImage?.path ||
    gallery?.[0]?.path ||
    activeVariant?.productGallery?.[0]?.path ||
    "";

  const effMrp = toNum(activeVariant?.mrp ?? product?.mrp);
  const effSp = toNum(activeVariant?.specialPrice ?? product?.specialPrice);
  const offPct = percentOff(effMrp, effSp);
  const priceNow = offPct ? effSp : effMrp;
  const priceWas = offPct ? effMrp : null;
  const inStock = inferInStock(activeVariant || product);

  // cart
  const itemsMap = useSelector(selectItemsMap) || {};
  const lineKey = `${product?._id || ""}|${activeVariant?._id || ""}`;
  const inCartLine = itemsMap[lineKey];
  const qtyNow = inCartLine?.qty || 0;

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const primaryImage = heroSrc || gallery?.[0]?.path || undefined;
    dispatch(
      addItem({
        productId: product?._id,
        slug,
        name: product?.name,
        qty: 1,
        price: priceNow,
        mrp: effMrp,
        image: primaryImage,
        variant: activeVariant
          ? {
              id: activeVariant._id,
              sku: activeVariant.sku,
              name: activeVariant.variantName,
              image:
                activeVariant.productGallery?.[0]?.path ||
                activeVariant.swatchImage?.path ||
                undefined,
            }
          : null,
      })
    );
  }, [
    dispatch,
    product,
    activeVariant,
    priceNow,
    effMrp,
    heroSrc,
    gallery,
    slug,
  ]);

  // sticky bars (desktop top; mobile bottom above BottomNav)
  const [headerOffset, setHeaderOffset] = useState(0);
  useEffect(() => {
    const measure = () => {
      const hdr = document.querySelector("header");
      setHeaderOffset(hdr ? hdr.getBoundingClientRect().height + 8 : 8);
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, []);

  const galleryRef = useRef(null);
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: `-${headerOffset}px 0px 0px` }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [headerOffset, gallery?.length]);

  const BOTTOM_NAV_H = 56;

  return (
    <main>
      {/* DESKTOP sticky (sits under header; header has z-50) */}
      {showSticky && (
        <div
          className="fixed inset-x-0 hidden md:block z-40"
          style={{ top: headerOffset }}
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="bg-white/95 dark:bg-neutral-900/95 supports-[backdrop-filter]:backdrop-blur rounded-lg shadow-md border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                    {heroSrc ? (
                      <Image
                        src={heroSrc}
                        alt="hero"
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-medium truncate">
                      {product?.name || "Product"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-gray-900">
                        {money(priceNow)}
                        {priceWas ? (
                          <span className="ml-1 line-through text-muted-foreground">
                            {money(priceWas)}
                          </span>
                        ) : null}
                      </span>
                      {offPct !== null && (
                        <span className="text-emerald-600">{offPct}% OFF</span>
                      )}
                      {ratingSummary.loaded && ratingSummary.total > 0 && (
                        <span className="ml-2">
                          ★ {ratingSummary.average.toFixed(1)} (
                          {ratingSummary.total})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <QtyControl
                    size="sm"
                    className="w-[160px]"
                    qty={qtyNow}
                    onDec={() => {
                      if (!inCartLine) return;
                      const next = Math.max(0, qtyNow - 1);
                      if (next === 0)
                        dispatch(
                          removeItem({
                            productId: product?._id,
                            variant: activeVariant
                              ? { id: activeVariant._id }
                              : null,
                          })
                        );
                      else
                        dispatch(
                          setQty({
                            productId: product?._id,
                            variant: activeVariant
                              ? { id: activeVariant._id }
                              : null,
                            qty: next,
                          })
                        );
                    }}
                    onInc={() => {
                      if (!inCartLine) return handleAddToCart();
                      dispatch(
                        setQty({
                          productId: product?._id,
                          variant: activeVariant
                            ? { id: activeVariant._id }
                            : null,
                          qty: qtyNow + 1,
                        })
                      );
                    }}
                  />

                  {qtyNow > 0 ? (
                    <Button
                      className="rounded-full h-9 px-4"
                      onClick={() => router.push("/checkout")}
                    >
                      Go to checkout
                    </Button>
                  ) : (
                    <Button
                      className="rounded-full h-9 px-4"
                      onClick={handleAddToCart}
                      disabled={!inStock || !product}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to cart
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE sticky (above BottomNav) */}
      {showSticky && (
        <div
          className="fixed inset-x-0 md:hidden z-40"
          style={{
            bottom: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom))`,
          }}
        >
          <div className="mx-auto max-w-[1200px] px-3">
            <div className="rounded-t-xl border-t shadow-lg bg-white/95 dark:bg-neutral-900/95 supports-[backdrop-filter]:backdrop-blur p-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold">{money(priceNow)}</div>
                {qtyNow > 0 ? (
                  <Button
                    className="rounded-full h-10 px-5 text-sm"
                    onClick={() => router.push("/checkout")}
                  >
                    Go to checkout
                  </Button>
                ) : (
                  <Button
                    className="rounded-full h-10 px-5 text-sm"
                    onClick={handleAddToCart}
                    disabled={!inStock || !product}
                  >
                    Add to cart
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        {/* LEFT: gallery (sentinel for sticky) */}
        <section className="lg:col-span-7" ref={galleryRef}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border overflow-hidden">
            <div className="relative aspect-[4/3] bg-white">
              {heroSrc ? (
                <Image
                  src={heroSrc}
                  alt={product?.name || "Product image"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 700px"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              {qtyNow > 0 && (
                <Badge className="absolute top-3 left-3 bg-yellow-50 text-yellow-900">
                  In cart • {qtyNow}
                </Badge>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT: summary card */}
        <aside className="lg:col-span-5">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border p-5 md:p-6 space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                {product?.name}
              </h1>
              {ratingSummary.loaded && ratingSummary.total > 0 && (
                <div className="text-sm text-muted-foreground">
                  ★ {ratingSummary.average.toFixed(1)} ({ratingSummary.total})
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <div className="text-2xl font-bold">{money(priceNow)}</div>
              {priceWas && (
                <div className="text-sm text-muted-foreground line-through">
                  {money(priceWas)}
                </div>
              )}
              {offPct !== null && (
                <div className="text-sm text-emerald-600">{offPct}% OFF</div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full ${
                  inStock ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  inStock ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {inStock ? "In stock" : "Out of stock"}
              </span>
            </div>

            {/* Variants – ring visible (not clipped) and on the same line */}
            {variants.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Variants</div>
                <div className="flex items-center gap-3 flex-wrap">
                  {variants.map((v, i) => {
                    const img = getVariantHero(v, heroSrc);
                    const selected = i === selectedIdx;
                    return (
                      <button
                        key={v?._id || i}
                        type="button"
                        onClick={() => setSelectedIdx(i)}
                        className={[
                          "relative p-0.5 rounded-full transition",
                          selected
                            ? "ring-2 ring-yellow-400"
                            : "ring-1 ring-slate-200 hover:ring-slate-300",
                        ].join(" ")}
                        aria-pressed={selected}
                        title={v?.variantName || v?.sku || `Option ${i + 1}`}
                      >
                        <span className="block h-10 w-10 rounded-full overflow-hidden bg-muted">
                          {img ? (
                            <Image
                              src={img}
                              alt={v?.variantName || `variant-${i}`}
                              width={40}
                              height={40}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <span className="block h-full w-full bg-muted" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Qty + primary action */}
            <div className="space-y-3">
              <QtyControl
                size="md"
                qty={qtyNow}
                onDec={() => {
                  if (!inCartLine) return;
                  const next = Math.max(0, qtyNow - 1);
                  if (next === 0)
                    dispatch(
                      removeItem({
                        productId: product?._id,
                        variant: activeVariant
                          ? { id: activeVariant._id }
                          : null,
                      })
                    );
                  else
                    dispatch(
                      setQty({
                        productId: product?._id,
                        variant: activeVariant
                          ? { id: activeVariant._id }
                          : null,
                        qty: next,
                      })
                    );
                }}
                onInc={() => {
                  if (!inCartLine) return handleAddToCart();
                  dispatch(
                    setQty({
                      productId: product?._id,
                      variant: activeVariant ? { id: activeVariant._id } : null,
                      qty: qtyNow + 1,
                    })
                  );
                }}
              />

              {qtyNow > 0 ? (
                <Button
                  className="w-full h-11 rounded-xl text-[14px] font-semibold"
                  onClick={() => router.push("/checkout")}
                >
                  Go to checkout
                </Button>
              ) : (
                <Button
                  className="w-full h-11 rounded-xl text-[14px] font-semibold"
                  onClick={handleAddToCart}
                  disabled={!inStock || !product}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to cart
                </Button>
              )}
            </div>

            <Separator className="my-2" />

            {product?.shortDescription ? (
              <p className="text-sm text-muted-foreground leading-6">
                {product.shortDescription}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {/* spacer so mobile sticky doesn’t overlap the end */}
      <div className="h-[80px] md:h-0" />
    </main>
  );
}
