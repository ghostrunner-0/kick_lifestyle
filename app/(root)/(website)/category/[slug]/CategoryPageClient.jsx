"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

/* icons */
import { Funnel, RotateCcw, ArrowUpDown, X, Sparkles } from "lucide-react";

/* app components */
import TitleCard from "@/components/application/TitleCard";
import ProductCard from "@/components/application/website/ProductCard";
import { useCategories } from "@/components/providers/CategoriesProvider";

/* ---------------- helpers ---------------- */
const ACCENT = "#fcba17";
const toTitle = (s = "") =>
  s
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
const priceOf = (p) =>
  Number.isFinite(p?.specialPrice)
    ? Number(p.specialPrice)
    : Number(p?.mrp ?? 0);
const fmtRs = (n) =>
  Number.isFinite(n) ? `Rs. ${n.toLocaleString("en-IN")}` : "";
const isDefaultPrice = (range, min, max) =>
  Number(range?.[0]) === Number(min) && Number(range?.[1]) === Number(max);

/* animations */
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
};
const listIn = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};
const chipIn = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.16 } },
};

/* sorting */
const SORTS = {
  relevance: { label: "Relevance" },
  price_asc: { label: "Price: Low to High" },
  price_desc: { label: "Price: High to Low" },
  newest: { label: "Newest" },
};

/* debounce */
function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* variant hero */
const heroOfVariant = (v) =>
  v?.heroImage?.path ||
  v?.productGallery?.[0]?.path ||
  v?.swatchImage?.path ||
  "";

/* ---------------- Filter Panel (shared for desktop + drawer) ---------------- */
function FilterPanel({
  minPrice,
  maxPrice,
  priceRange,
  setPriceRange,
  warranty,
  setWarranty,
  inStockOnly,
  setInStockOnly,
  variantAgg,
  selVariant,
  setSelVariant,
  colorAgg,
  selColor,
  setSelColor,
  chips,
  onReset,
}) {
  return (
    <>
      <Accordion type="multiple" defaultValue={["price", "warranty"]}>
        {/* Price */}
        <AccordionItem value="price" className="border-b-0">
          <AccordionTrigger className="py-2 text-base">Price</AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {fmtRs(Math.max(minPrice, priceRange[0]))} –{" "}
                {fmtRs(Math.min(maxPrice, priceRange[1]))}
              </Badge>
            </div>
            <Slider
              min={minPrice}
              max={maxPrice}
              step={100}
              value={priceRange}
              onValueChange={setPriceRange}
              className="mt-3"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none"
                type="number"
                min={minPrice}
                max={priceRange[1]}
                value={priceRange[0]}
                onChange={(e) =>
                  setPriceRange([Number(e.target.value || 0), priceRange[1]])
                }
              />
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none"
                type="number"
                min={priceRange[0]}
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) =>
                  setPriceRange([priceRange[0], Number(e.target.value || 0)])
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <Separator className="my-2" />

        {/* Warranty & stock */}
        <AccordionItem value="warranty" className="border-b-0">
          <AccordionTrigger className="py-2 text-base">
            Warranty & stock
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="mb-3">
              <div className="text-sm mb-2">Warranty</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={warranty === 6 ? "default" : "outline"}
                  onClick={() => setWarranty(warranty === 6 ? 0 : 6)}
                >
                  ≥ 6m
                </Button>
                <Button
                  size="sm"
                  variant={warranty === 12 ? "default" : "outline"}
                  onClick={() => setWarranty(warranty === 12 ? 0 : 12)}
                >
                  ≥ 12m
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="instock-sb" className="text-sm">
                In stock only
              </Label>
              <Switch
                id="instock-sb"
                checked={inStockOnly}
                onCheckedChange={setInStockOnly}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <Separator className="my-2" />

        {/* Variants */}
        <AccordionItem value="variant" className="border-b-0">
          <AccordionTrigger className="py-2 text-base">
            Variant options
          </AccordionTrigger>
          <AccordionContent className="pt-3 ps-2">
            <TooltipProvider delayDuration={80}>
              <div className="flex flex-wrap gap-3">
                {variantAgg.map((v) => {
                  const active = selVariant.includes(v.label);
                  return (
                    <Tooltip key={v.label}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() =>
                            setSelVariant((curr) =>
                              curr.includes(v.label)
                                ? curr.filter((x) => x !== v.label)
                                : [...curr, v.label]
                            )
                          }
                          className={`relative h-10 w-10 rounded-full border overflow-hidden transition ring-offset-2 ${
                            active
                              ? "ring-2 ring-yellow-400"
                              : "hover:opacity-90"
                          }`}
                          title={v.label}
                        >
                          {v.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.image}
                              alt={v.label}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              draggable={false}
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-[10px]">
                              {v.label.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{v.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            {colorAgg.length ? (
              <>
                <div className="mt-4 text-xs text-muted-foreground">Colors</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colorAgg.map((c) => {
                    const active = selColor.includes(c.label);
                    return (
                      <Button
                        key={c.label}
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() =>
                          setSelColor((curr) =>
                            curr.includes(c.label)
                              ? curr.filter((x) => x !== c.label)
                              : [...curr, c.label]
                          )
                        }
                      >
                        {c.label} <Badge className="ml-2">{c.count}</Badge>
                      </Button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Active chips + Reset */}
      <AnimatePresence>
        {chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-5"
          >
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <motion.button
                  key={chip.key}
                  variants={chipIn}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  onClick={chip.clear}
                  className="inline-flex items-center h-8 rounded-full bg-secondary px-3 text-xs hover:bg-secondary/80"
                  title={`Remove ${chip.label}`}
                >
                  {chip.label} <X className="ml-2 h-3.5 w-3.5" />
                </motion.button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------ */

export default function CategoryPageClient({ params }) {
  const slug = params?.slug;
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  /* category header */
  const { categories } = useCategories();
  const category = useMemo(
    () => categories?.find((c) => c.slug === slug) || null,
    [categories, slug]
  );
  const title = category?.name || toTitle(slug);
  const bannerSrc = category?.banner?.path || undefined;
  const subtitle =
    (category?.description && category.description.trim()) ||
    `Explore the best ${title} at KICK`;

  /* ---- base data fetch (with abort) ---- */
  const [loading, setLoading] = useState(true);
  const [baseProducts, setBaseProducts] = useState([]);
  const abortRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetch(`/api/website/products?category=${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j) => setBaseProducts(Array.isArray(j?.data) ? j.data : []))
      .catch((err) => {
        if (err?.name !== "AbortError")
          console.error("Products fetch failed:", err);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [slug]);

  /* ---- dynamic price bounds ---- */
  const { minPrice, maxPrice } = useMemo(() => {
    if (!baseProducts.length) return { minPrice: 0, maxPrice: 10000 };
    let min = Infinity,
      max = -Infinity;
    for (const p of baseProducts) {
      const pr = priceOf(p);
      if (Number.isFinite(pr)) {
        if (pr < min) min = pr;
        if (pr > max) max = pr;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max))
      return { minPrice: 0, maxPrice: 10000 };
    const pad = Math.round((max - min) * 0.05);
    return { minPrice: Math.max(0, min - pad), maxPrice: max + pad };
  }, [baseProducts]);

  /* ---- URL -> UI state ---- */
  const qPrice = search.get("price"); // a-b
  const qWarranty = Number(search.get("warranty")); // 6 | 12
  const qStock = search.get("stock"); // "in"
  const qSort = search.get("sort") || "relevance";
  const qVariant = (search.get("variant") || "").split(",").filter(Boolean);
  const qColor = (search.get("color") || "").split(",").filter(Boolean);

  const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);
  const [warranty, setWarranty] = useState(
    qWarranty === 6 || qWarranty === 12 ? qWarranty : 0
  );
  const [inStockOnly, setInStockOnly] = useState(qStock === "in");
  const [sortKey, setSortKey] = useState(qSort);
  const [selVariant, setSelVariant] = useState(qVariant);
  const [selColor, setSelColor] = useState(qColor);

  /* keep state synced if URL/bounds change */
  useEffect(() => {
    if (qPrice?.includes("-")) {
      const [a, b] = qPrice.split("-").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) setPriceRange([a, b]);
      else setPriceRange([minPrice, maxPrice]);
    } else {
      setPriceRange([minPrice, maxPrice]);
    }
    setWarranty(qWarranty === 6 || qWarranty === 12 ? qWarranty : 0);
    setInStockOnly(qStock === "in");
    setSortKey(qSort || "relevance");
    setSelVariant(qVariant);
    setSelColor(qColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice, qPrice, qWarranty, qStock, qSort, search]);

  /* ---- URL writer (no loops) ---- */
  const priceDebounced = useDebounced(priceRange, 250);
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());

    // price
    if (isDefaultPrice(priceDebounced, minPrice, maxPrice)) sp.delete("price");
    else sp.set("price", `${priceDebounced[0]}-${priceDebounced[1]}`);

    // warranty
    if (warranty === 6 || warranty === 12) sp.set("warranty", String(warranty));
    else sp.delete("warranty");

    // stock
    if (inStockOnly) sp.set("stock", "in");
    else sp.delete("stock");

    // sort
    if (sortKey) sp.set("sort", sortKey);
    else sp.delete("sort");

    // variant
    if (selVariant.length) sp.set("variant", selVariant.join(","));
    else sp.delete("variant");

    // color
    if (selColor.length) sp.set("color", selColor.join(","));
    else sp.delete("color");

    const next = `${pathname}?${sp.toString()}`;
    const curr = `${pathname}?${search.toString()}`;
    if (next !== curr) router.replace(next, { scroll: false });
  }, [
    pathname,
    router,
    search,
    minPrice,
    maxPrice,
    priceDebounced,
    warranty,
    inStockOnly,
    sortKey,
    selVariant,
    selColor,
  ]);

  /* ---- aggregates for variant filters ---- */
  const { variantAgg, colorAgg } = useMemo(() => {
    const vMap = new Map(); // key -> {label, image, count}
    const cMap = new Map(); // color -> count
    for (const p of baseProducts) {
      const variants = Array.isArray(p?.variants) ? p.variants : [];
      for (const v of variants) {
        const label = v?.variantName || v?.sku || "";
        if (label) {
          const img = heroOfVariant(v);
          const prev = vMap.get(label) || { label, image: img, count: 0 };
          if (!prev.image && img) prev.image = img;
          prev.count += 1;
          vMap.set(label, prev);
        }
        const color = (v?.color || v?.colour || "").toString().trim();
        if (color) cMap.set(color, (cMap.get(color) || 0) + 1);
      }
    }
    return {
      variantAgg: Array.from(vMap.values()),
      colorAgg: Array.from(cMap.entries()).map(([label, count]) => ({
        label,
        count,
      })),
    };
  }, [baseProducts]);

  /* ---- chips from URL ---- */
  const chips = useMemo(() => {
    const list = [];
    if (qPrice?.includes("-")) {
      const [a, b] = qPrice.split("-").map(Number);
      const def =
        Number(a) === Number(minPrice) && Number(b) === Number(maxPrice);
      if (!def && Number.isFinite(a) && Number.isFinite(b)) {
        list.push({
          key: "price",
          label: `${fmtRs(a)} – ${fmtRs(b)}`,
          clear: () => clearParam("price"),
        });
      }
    }
    if (qWarranty === 6 || qWarranty === 12) {
      list.push({
        key: "warranty",
        label: `Warranty ≥ ${qWarranty}m`,
        clear: () => clearParam("warranty"),
      });
    }
    if (qStock === "in") {
      list.push({
        key: "stock",
        label: "In stock",
        clear: () => clearParam("stock"),
      });
    }
    for (const v of selVariant) {
      list.push({
        key: `v:${v}`,
        label: v,
        clear: () => setSelVariant((s) => s.filter((x) => x !== v)),
      });
    }
    for (const c of selColor) {
      list.push({
        key: `c:${c}`,
        label: c,
        clear: () => setSelColor((s) => s.filter((x) => x !== c)),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qPrice, qWarranty, qStock, selVariant, selColor, minPrice, maxPrice]);

  const isFilterActive = chips.length > 0;

  /* ---- filter + sort ---- */
  const items = useMemo(() => {
    let list = baseProducts.slice();

    const [low, high] = priceRange;
    list = list.filter((p) => {
      const pr = priceOf(p);
      return Number.isFinite(pr) && pr >= low && pr <= high;
    });

    if (warranty === 6 || warranty === 12) {
      list = list.filter((p) => Number(p?.warrantyMonths) >= warranty);
    }

    if (inStockOnly) {
      list = list.filter((p) => Number(p?.stock) > 0);
    }

    if (selVariant.length) {
      list = list.filter((p) => {
        const variants = Array.isArray(p?.variants) ? p.variants : [];
        const names = new Set(
          variants
            .map((v) => (v?.variantName || v?.sku || "").toString().trim())
            .filter(Boolean)
        );
        return selVariant.every((v) => names.has(v));
      });
    }

    if (selColor.length) {
      list = list.filter((p) => {
        const variants = Array.isArray(p?.variants) ? p.variants : [];
        const colors = new Set(
          variants
            .map((v) => (v?.color || v?.colour || "").toString().trim())
            .filter(Boolean)
        );
        return selColor.every((c) => colors.has(c));
      });
    }

    switch (sortKey) {
      case "price_asc":
        list.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case "price_desc":
        list.sort((a, b) => priceOf(b) - priceOf(a));
        break;
      case "newest":
        list.sort(
          (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
        );
        break;
      default:
      // relevance
    }
    return list;
  }, [
    baseProducts,
    priceRange,
    warranty,
    inStockOnly,
    selVariant,
    selColor,
    sortKey,
  ]);

  /* URL utils */
  const clearParam = (key) => {
    const sp = new URLSearchParams(search.toString());
    sp.delete(key);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };
  const clearAll = () => router.replace(`${pathname}`, { scroll: false });

  /* mobile drawer */
  const [openSheet, setOpenSheet] = useState(false);

  return (
    <main
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(140deg, rgba(252,186,23,0.028) 0%, rgba(252,186,23,0.018) 20%, transparent 55%)",
      }}
    >
      {/* Header */}
      <section className="py-5">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <TitleCard
              title={title}
              subtitle={subtitle}
              badge="Category"
              accent={ACCENT}
              variant={bannerSrc ? "image" : "solid"}
              imageUrl={bannerSrc}
              align="center"
              size="md"
            />
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-16 md:pb-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-12 gap-6">
            {/* Desktop sidebar */}
            <motion.aside
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="hidden md:block col-span-3 sticky top-[88px] self-start h-fit rounded-xl border border-black/5 bg-white/70 backdrop-blur-[2px] p-4"
            >
              <FilterPanel
                minPrice={minPrice}
                maxPrice={maxPrice}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                warranty={warranty}
                setWarranty={setWarranty}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
                variantAgg={variantAgg}
                selVariant={selVariant}
                setSelVariant={setSelVariant}
                colorAgg={colorAgg}
                selColor={selColor}
                setSelColor={setSelColor}
                chips={chips}
                onReset={clearAll}
              />
            </motion.aside>

            {/* Grid area */}
            <div className="col-span-12 md:col-span-9">
              {/* top row: sort */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="mb-3 flex items-center gap-2"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      {SORTS[sortKey]?.label || "Relevance"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {Object.entries(SORTS).map(([k, v]) => (
                      <DropdownMenuItem
                        key={k}
                        onClick={() => setSortKey(k)}
                        className={k === sortKey ? "font-semibold" : ""}
                      >
                        {v.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {isFilterActive && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Reset
                  </Button>
                )}
              </motion.div>

              {/* chips (mobile) */}
              <div className="md:hidden mb-4">
                <AnimatePresence>
                  {isFilterActive && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-wrap gap-2"
                    >
                      {chips.map((chip) => (
                        <button
                          key={chip.key}
                          onClick={chip.clear}
                          className="inline-flex items-center h-8 rounded-full bg-secondary px-3 text-xs hover:bg-secondary/80"
                        >
                          {chip.label} <X className="ml-2 h-3.5 w-3.5" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* grid */}
              <AnimatePresence mode="wait">
                {loading ? (
                  <div className="grid gap-5 grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden rounded-2xl">
                        <Skeleton className="w-full aspect-[4/3]" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : items.length ? (
                  <motion.div
                    key={`${slug}|${search.toString()}|${sortKey}|${
                      items.length
                    }`}
                    variants={listIn}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    className="grid gap-6 grid-cols-2 lg:grid-cols-3"
                  >
                    {items.map((item) => (
                      <ProductCard key={item._id} product={item} p={item} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="text-center py-20"
                  >
                    <Sparkles className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold mb-1">
                      No products found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try tweaking filters or resetting them.
                    </p>
                    <Button variant="outline" onClick={clearAll}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Reset Filters
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile sticky Filter button + Drawer */}
        <div className="md:hidden">
          <Sheet open={openSheet} onOpenChange={setOpenSheet}>
            <SheetTrigger asChild>
              <Button
                className="fixed left-[-10px] bottom-[calc(env(safe-area-inset-bottom)+120px)] z-40 shadow-lg"
                type="button"
              >
                <Funnel className="h-4 w-4 ms-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>

              <div className="p-4 overflow-y-auto h-[calc(100vh-56px-64px)]">
                <FilterPanel
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  warranty={warranty}
                  setWarranty={setWarranty}
                  inStockOnly={inStockOnly}
                  setInStockOnly={setInStockOnly}
                  variantAgg={variantAgg}
                  selVariant={selVariant}
                  setSelVariant={setSelVariant}
                  colorAgg={colorAgg}
                  selColor={selColor}
                  setSelColor={setSelColor}
                  chips={chips}
                  onReset={() => {
                    clearAll();
                    // keep drawer open so user sees changes
                  }}
                />
              </div>

              <SheetFooter className="p-4 border-t">
                <SheetClose asChild>
                  <Button className="w-full" type="button">
                    Apply
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </section>
    </main>
  );
}
