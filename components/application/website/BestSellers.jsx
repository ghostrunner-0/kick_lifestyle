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
import useEmblaCarousel from "embla-carousel-react";

import ProductCard from "@/components/application/website/ProductCard";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";

/* ----------------------- utils (kept from your logic) ---------------------- */
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

const fade = { hidden: { opacity: 0 }, show: { opacity: 1 } };
const PINNED_SLUG = "true-wireless-earbuds";

/* ------------------- inline compact premium tab bar (TabsNeo) ------------------- */
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
              data-tab-idx={i}
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
                {typeof t.count === "number" ? (
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
                ) : null}
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
    setActiveKey, // provider fetches when this changes
  } = useProducts();

  // 1) order categories with pinned first
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

  // 2) keys aligned to ordered list
  const catKeys = useMemo(
    () =>
      Array.isArray(orderedCategories) ? orderedCategories.map(deriveKey) : [],
    [orderedCategories]
  );

  // 3) initial selection: prefer pinned; don't override valid user selection
  useEffect(() => {
    if (!orderedCategories.length) return;
    const pinnedCat = orderedCategories.find(
      (c) => String(c?.slug || "").toLowerCase() === PINNED_SLUG
    );
    const preferredKey = deriveKey(pinnedCat || orderedCategories[0]);
    const activeIsValid = catKeys.includes(activeKey);
    if (!activeIsValid && preferredKey) setActiveKey(preferredKey);
  }, [orderedCategories, catKeys, activeKey, setActiveKey]);

  // 4) map activeKey <-> tab index
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

  // 5) compute items (dedupe + cap)
  const displayProducts = useMemo(() => {
    const uniq = dedupeByCanonical(products || []);
    return uniq.slice(0, 24);
  }, [products]);

  // 6) tab change -> setActiveKey (triggers provider fetch)
  const handleTabChange = useCallback(
    (idx) => {
      const key = catKeys[idx];
      if (key && key !== activeKey) setActiveKey(key);
    },
    [catKeys, activeKey, setActiveKey]
  );

  /* --------------------------- animations for load & switch --------------------------- */
  const blockVariants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
  };
  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { when: "beforeChildren", staggerChildren: 0.06 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 14, scale: 0.985 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
    },
    exit: { opacity: 0, y: -8, scale: 0.985, transition: { duration: 0.18 } },
  };

  /* ------------------------ inline Embla (no old comp) ----------------------- */
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    slidesToScroll: 1,
    containScroll: "trimSnaps",
    skipSnaps: false,
  });
  const [progress, setProgress] = useState(0);
  const itemsCount = displayProducts.length;

  const onScroll = useCallback((api) => {
    const p = api?.scrollProgress();
    const clamped = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
    setProgress(clamped);
  }, []);

  // re-init & snap to start whenever content or tab changes
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("scroll", onScroll);
    emblaApi.on("resize", onScroll);
    emblaApi.reInit();
    emblaApi.scrollTo(0, true);
    onScroll(emblaApi);
    return () => {
      emblaApi.off("scroll", onScroll);
      emblaApi.off("resize", onScroll);
    };
  }, [emblaApi, onScroll, itemsCount, activeIndex]);

  const thumbPct = itemsCount > 0 ? Math.min(100, 100 / itemsCount) : 100;
  const leftPct = Math.max(
    0,
    Math.min(100 - thumbPct, progress * (100 - thumbPct))
  );

  if (!categories?.length && !catLoading) return null;

  return (
    <section className={"py-8 " + className}>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          {/* Title */}
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Top Picks For You
          </h2>

          {/* Right cluster (DESKTOP): Tabs beside View all */}
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

          {/* Mobile arrow-only CTA */}
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

        {/* Mobile tabs UNDER the title (desktop has them beside View all) */}
        <div className="mt-3 sm:hidden">
          <TabsNeo
            tabs={labels}
            activeIndex={activeIndex}
            onChange={handleTabChange}
          />
        </div>

        {/* Loading skeleton for categories (kept) */}
        {catLoading && !categories.length ? (
          <div className="mt-3 flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className="h-8 w-20 rounded-full bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {/* Carousel (Embla inline) with category-change animation */}
        <div className="mt-5 sm:mt-6">
          <AnimatePresence mode="wait">
            {/* EMPTY STATE — designed card */}
            {!displayProducts.length && !prodLoading ? (
              <motion.div
                key={`empty-${activeKey || "none"}`}
                variants={fade}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-gradient-to-br from-amber-50 to-white dark:from-neutral-900 dark:to-neutral-950 px-5 py-8 sm:px-8 sm:py-12"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/30 blur-2xl dark:bg-yellow-500/10" />
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-amber-300/30 blur-2xl dark:bg-yellow-600/10" />

                <div className="relative">
                  <h3 className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Nothing here… yet.
                  </h3>
                  <p className="mt-1.5 text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
                    We’re lining up great picks for{" "}
                    <span className="font-semibold">
                      {currentCategory?.name || "this category"}
                    </span>
                    . In the meantime, explore everything in the collection.
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
                key={`list-${activeKey || "default"}`}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
                }}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        when: "beforeChildren",
                        staggerChildren: 0.06,
                      },
                    },
                  }}
                  initial="hidden"
                  animate="show"
                >
                  {/* Edge-to-edge on mobile with proper gutters */}
                  <div className="-mx-4 sm:-mx-6 lg:-mx-8">
                    <div className="px-2 sm:px-4 lg:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      <div
                        ref={emblaRef}
                        className="overflow-hidden"
                        aria-label="Products scroller"
                      >
                        <ul className="flex select-none snap-x snap-mandatory">
                          {/* LEFT gutter for mobile */}
                          <li
                            className="shrink-0 basis-3 sm:hidden"
                            aria-hidden
                          />
                          {(displayProducts.length
                            ? displayProducts
                            : Array.from({ length: 8 })
                          ).map((p, i) => (
                            <motion.li
                              variants={{
                                hidden: { opacity: 0, y: 14, scale: 0.985 },
                                show: {
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                  transition: { duration: 0.32 },
                                },
                                exit: {
                                  opacity: 0,
                                  y: -8,
                                  scale: 0.985,
                                  transition: { duration: 0.18 },
                                },
                              }}
                              key={p?._id || i}
                              className={[
                                "shrink-0 px-2 sm:px-3",
                                "basis-[86%] xs:basis-[74%] sm:basis-1/2 md:basis-1/3 xl:basis-1/4",
                                "snap-start",
                              ].join(" ")}
                              aria-roledescription="slide"
                              aria-label={`Slide ${i + 1} of ${
                                displayProducts.length || 8
                              }`}
                            >
                              {p ? (
                                <div className="h-full">
                                  <ProductCard product={p} />
                                </div>
                              ) : (
                                <div className="h-[260px] sm:h-[320px] md:h-[340px] rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
                              )}
                            </motion.li>
                          ))}
                          {/* RIGHT gutter for mobile */}
                          <li
                            className="shrink-0 basis-3 sm:hidden"
                            aria-hidden
                          />
                        </ul>
                      </div>
                    </div>

                    {/* progress thumb */}
                    {itemsCount > 1 && (
                      <div className="relative mt-3 h-[6px] select-none">
                        <span
                          className="absolute top-1/2 -translate-y-1/2 h-px rounded-full bg-black/15 dark:bg-white/20 w-full"
                          aria-hidden="true"
                        />
                        <span
                          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-black/35 dark:bg-white/40"
                          style={{ width: `${thumbPct}%`, left: `${leftPct}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
