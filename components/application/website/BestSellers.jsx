"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import ProductCard from "@/components/application/website/ProductCard";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";

/* ----------------------- utils ---------------------- */
const canonicalKey = (p) => {
  if (!p) return null;
  const slug =
    p.slug || p.handle || p.data?.slug || p.productSlug || p.seo?.slug;
  if (slug) return `slug:${String(slug).toLowerCase()}`;
  const parent = p.parentId || p.productId || p.pid || p.masterId || p.groupId;
  if (parent) return `pid:${parent}`;
  const name = (p.name || p.title || "").trim().toLowerCase();
  const basePrice = p.specialPrice ?? p.price ?? p.mrp ?? p.data?.price ?? "";
  return `name:${name}|price:${basePrice}`;
};

const dedupeByCanonical = (arr) => {
  const seen = new Set();
  const out = [];
  for (const item of arr || []) {
    const key = canonicalKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const PINNED_SLUG = "true-wireless-earbuds";

/* product has ANY stock (base or variant) */
function hasAnyStock(p) {
  if (!p) return false;

  const baseRaw =
    p.stock ?? p.quantity ?? p.qty ?? p.inventory ?? p.availableQty ?? null;
  const base = Number(baseRaw);
  const baseHas = Number.isFinite(base) && base > 0;

  const variants = Array.isArray(p.variants) ? p.variants : [];
  const variantHas = variants.some((v) => {
    const vRaw =
      v.stock ?? v.quantity ?? v.qty ?? v.inventory ?? v.availableQty ?? null;
    const vs = Number(vRaw);
    return Number.isFinite(vs) && vs > 0;
  });

  return baseHas || variantHas;
}

/* ------------------- TabsNeo (unchanged) ------------------- */
function TabsNeo({ tabs = [], activeIndex = 0, onChange, className = "" }) {
  const btnRefs = useRef([]);
  const trackRef = useRef(null);
  const [indicator, setIndicator] = useState({ x: 0, w: 0 });

  const normTabs = useMemo(
    () =>
      tabs.map((t) =>
        typeof t === "string"
          ? { label: t }
          : { label: t?.label, count: t?.count, icon: t?.icon }
      ),
    [tabs]
  );

  const recalc = useCallback(() => {
    const el = btnRefs.current?.[activeIndex];
    const track = trackRef.current;
    if (!el || !track) return;
    const rb = el.getBoundingClientRect();
    const rt = track.getBoundingClientRect();
    setIndicator({
      x: rb.left - rt.left + track.scrollLeft,
      w: rb.width,
    });
  }, [activeIndex]);

  useLayoutEffect(recalc, [recalc, normTabs.length]);
  useEffect(() => {
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    const id = setInterval(recalc, 120);
    setTimeout(() => clearInterval(id), 600);
    return () => {
      window.removeEventListener("resize", onResize);
      clearInterval(id);
    };
  }, [recalc]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = Math.min(normTabs.length - 1, activeIndex + 1);
      onChange?.(next);
      btnRefs.current?.[next]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      onChange?.(prev);
      btnRefs.current?.[prev]?.focus();
    }
  };

  return (
    <div className={["relative", className].join(" ")}>
      <div
        ref={trackRef}
        role="tablist"
        aria-label="Categories"
        className={[
          "relative flex items-center gap-1.5 sm:gap-2 overflow-x-auto overflow-y-hidden",
          "px-1 py-1 rounded-xl",
          "bg-white/70 dark:bg-neutral-900/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur",
          "ring-1 ring-black/5 dark:ring-white/10",
          "no-scrollbar",
          "[mask-image:linear-gradient(to_right,transparent,black_10px,black_calc(100%-10px),transparent)]",
        ].join(" ")}
        onKeyDown={onKeyDown}
      >
        {/* sliding highlight */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-8 sm:h-9 rounded-full"
          style={{ left: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          animate={{ x: indicator.x, width: indicator.w }}
        >
          <span
            className="block h-full w-full rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10
                       bg-[linear-gradient(135deg,#ffe08a,#fcba17_45%,#f39c12)]
                       dark:bg-[linear-gradient(135deg,#facc15,#eab308_45%,#d97706)]"
          />
        </motion.span>

        {normTabs.map((t, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={`${t.label}-${i}`}
              ref={(el) => (btnRefs.current[i] = el)}
              role="tab"
              aria-selected={active}
              onClick={() => onChange?.(i)}
              className={[
                "relative z-[1] shrink-0",
                "h-8 sm:h-9 px-3 sm:px-4 rounded-full",
                "text-[12.5px] sm:text-[14px] font-semibold whitespace-nowrap",
                "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#fcba17] dark:focus-visible:ring-offset-neutral-950",
                active
                  ? "text-neutral-900 dark:text-neutral-950"
                  : "text-neutral-700 dark:text-neutral-200",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-2">
                {t.icon ? <span className="text-sm">{t.icon}</span> : null}
                <span className="truncate max-w-[56vw] sm:max-w-none">
                  {t.label}
                </span>
                {typeof t.count === "number" && (
                  <span
                    className={[
                      "rounded-full text-[10.5px] leading-5 px-1.5",
                      active
                        ? "bg-black/10 text-black/80"
                        : "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/70",
                    ].join(" ")}
                  >
                    {t.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------- main component ---------------------------- */
export default function BestSellers({ className = "" }) {
  const { categories = [], isLoading: catLoading } = useCategories();
  const {
    products = [],
    isLoading: prodLoading,
    activeKey,
    setActiveKey,
  } = useProducts();

  /* order categories with pinned first */
  const orderedCategories = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];
    const pinned = [];
    const rest = [];
    for (const c of categories) {
      const slug = String(c?.slug || "").toLowerCase();
      if (slug === PINNED_SLUG) pinned.push(c);
      else rest.push(c);
    }
    return [...pinned, ...rest];
  }, [categories]);

  const catKeys = useMemo(
    () =>
      Array.isArray(orderedCategories) ? orderedCategories.map(deriveKey) : [],
    [orderedCategories]
  );

  /* initial selection: pinned or first */
  useEffect(() => {
    if (!orderedCategories.length) return;
    const pinnedCat = orderedCategories.find(
      (c) => String(c?.slug || "").toLowerCase() === PINNED_SLUG
    );
    const preferredKey = deriveKey(pinnedCat || orderedCategories[0]);
    const activeIsValid = catKeys.includes(activeKey);
    if (!activeIsValid && preferredKey) setActiveKey(preferredKey);
  }, [orderedCategories, catKeys, activeKey, setActiveKey]);

  /* active tab index (for TabsNeo) */
  const activeIndex = useMemo(() => {
    const idx = catKeys.indexOf(activeKey);
    return idx >= 0 ? idx : 0;
  }, [catKeys, activeKey]);

  const labels = useMemo(
    () => (orderedCategories || []).map((c) => c?.name || "Category"),
    [orderedCategories]
  );

  const currentCategory = orderedCategories[activeIndex];
  const currentHref = currentCategory?.slug
    ? `/category/${String(currentCategory.slug).toLowerCase()}`
    : "/category/all";

  /* products for active tab:
     - rely on useProducts() + activeKey for filtering
     - dedupe by canonical key
     - only IN-STOCK
     - cap to 24 for this block
  */
  const displayProducts = useMemo(() => {
    const uniq = dedupeByCanonical(products || []);
    const inStockOnly = uniq.filter((p) => hasAnyStock(p));
    return inStockOnly.slice(0, 24);
  }, [products]);

  const itemsCount = displayProducts.length;

  const handleTabChange = useCallback(
    (idx) => {
      const key = catKeys[idx];
      if (key && key !== activeKey) {
        setActiveKey(key);
      }
    },
    [catKeys, activeKey, setActiveKey]
  );

  if (!categories?.length && !catLoading) return null;

  return (
    <section className={"py-8 " + className}>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Top Picks For You
          </h2>

          {/* Desktop: tabs + view all */}
          <div className="hidden sm:flex items-center gap-3 min-w-0">
            <TabsNeo
              tabs={labels}
              activeIndex={activeIndex}
              onChange={handleTabChange}
            />
            <Link
              href={currentHref}
              prefetch
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-medium hover:bg-foreground/5 transition"
              aria-label={`View all in ${currentCategory?.name || "category"}`}
            >
              View all
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                aria-hidden
                className="-mr-0.5"
              >
                <path
                  d="M7 5l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </Link>
          </div>

          {/* Mobile: arrow CTA */}
          <Link
            href={currentHref}
            prefetch
            className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-black/10 text-foreground/80 hover:bg-foreground/5 transition"
            aria-label="View all"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
              <path
                d="M7 5l5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              />
            </svg>
          </Link>
        </div>

        {/* Mobile tabs */}
        <div className="mt-3 sm:hidden">
          <TabsNeo
            tabs={labels}
            activeIndex={activeIndex}
            onChange={handleTabChange}
          />
        </div>

        {/* Category loading hint */}
        {catLoading && !categories.length && (
          <div className="mt-3 flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className="h-8 w-20 rounded-full bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Products grid */}
        <div className="mt-5 sm:mt-6">
          <AnimatePresence mode="wait">
            {!itemsCount && !prodLoading ? (
              <motion.div
                key={`empty-${activeKey || "none"}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-gradient-to-br from-amber-50 to-white dark:from-neutral-900 dark:to-neutral-950 px-5 py-8 sm:px-8 sm:py-12"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/30 blur-2xl dark:bg-yellow-500/10" />
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-amber-300/30 blur-2xl dark:bg-yellow-600/10" />
                <div className="relative">
                  <h3 className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Nothing in stock here… yet.
                  </h3>
                  <p className="mt-1.5 text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
                    We&apos;re lining up great picks for{" "}
                    <span className="font-semibold">
                      {currentCategory?.name || "this category"}
                    </span>
                    . Check back soon or explore the full collection.
                  </p>
                  <div className="mt-4">
                    <Link
                      href={currentHref}
                      prefetch
                      className="inline-flex items-center gap-2 rounded-full bg-[#fcba17] px-4 py-2 text-sm font-semibold text-neutral-900 hover:brightness-95 transition shadow-sm"
                    >
                      Browse all
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        aria-hidden
                      >
                        <path
                          d="M7 5l5 5-5 5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`grid-${activeKey || "default"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className={`
                    grid gap-3 sm:gap-4 lg:gap-5
                    grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
                  `}
                >
                  {displayProducts.map((p, i) => (
                    <motion.div
                      key={p?._id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.02 }}
                    >
                      <ProductCard product={p} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
