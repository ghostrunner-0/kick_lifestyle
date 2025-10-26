"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
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

/* ---------- helpers ---------- */
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
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const arraysEqual = (a, b) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

const SORTS = {
  relevance: { label: "Relevance" },
  price_asc: { label: "Price: Low to High" },
  price_desc: { label: "Price: High to Low" },
  newest: { label: "Newest" },
};

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const heroOfVariant = (v) =>
  v?.heroImage?.path ||
  v?.productGallery?.[0]?.path ||
  v?.swatchImage?.path ||
  "";

/* stable QS builder (sorted keys) */
function toSortedQS(obj) {
  const sp = new URLSearchParams();
  Object.keys(obj || {})
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
    .sort()
    .forEach((k) => sp.set(k, obj[k]));
  return sp.toString();
}
function normalizeQS(qs) {
  if (!qs) return "";
  return toSortedQS(Object.fromEntries(new URLSearchParams(qs)));
}

/* ---------------- Filter Panel (desktop + drawer) ---------------- */
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
  onReset, // parent will also clear URL
}) {
  return (
    <>
      <Accordion
        type="multiple"
        defaultValue={["price", "warranty", "variant"]}
      >
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
              onValueChange={(v) =>
                setPriceRange([
                  clamp(v[0], minPrice, Math.max(minPrice, v[1])),
                  clamp(v[1], Math.max(minPrice, v[0]), maxPrice),
                ])
              }
              className="mt-3"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none"
                type="number"
                min={minPrice}
                max={priceRange[1]}
                value={priceRange[0]}
                onChange={(e) => {
                  const n = Number(e.target.value || 0);
                  setPriceRange(([_, hi]) => [clamp(n, minPrice, hi), hi]);
                }}
              />
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none"
                type="number"
                min={priceRange[0]}
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) => {
                  const n = Number(e.target.value || 0);
                  setPriceRange(([lo, _]) => [lo, clamp(n, lo, maxPrice)]);
                }}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <Separator className="my-2" />

        {/* Warranty & Stock */}
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

        {/* Variants + Colors */}
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
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
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
              onClick={() => {
                // Reset UI immediately
                setPriceRange([minPrice, maxPrice]);
                setWarranty(0);
                setInStockOnly(false);
                setSelVariant([]);
                setSelColor([]);
                // Then parent clears URL
                onReset();
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ----------------------- Page ----------------------- */
export default function CategoryPageClient({ params }) {
  const slug = params?.slug;
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const searchStr = search.toString(); // snapshot of URL qs

  // Guards to prevent URL<->UI ping-pong
  const lastWrittenQS = useRef(null); // last qs we wrote
  const firstSyncDone = useRef(false); // ensures single URL->UI sync per URL change
  const prevURLQS = useRef(searchStr); // detect real URL changes

  /* header */
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

  /* data fetch */
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
      .finally(() => !ctrl.signal.aborted && setLoading(false));

    return () => ctrl.abort();
  }, [slug]);

  /* price bounds */
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
  const boundsReady = Number.isFinite(minPrice) && Number.isFinite(maxPrice);

  /* read params */
  const sp = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const qPrice = sp.get("price"); // a-b
  const qWarranty = Number(sp.get("warranty")); // 6|12
  const qStock = sp.get("stock"); // "in"
  const qSort = sp.get("sort") || "relevance";
  const qVariant = (sp.get("variant") || "").split(",").filter(Boolean);
  const qColor = (sp.get("color") || "").split(",").filter(Boolean);

  /* UI state */
  const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);
  const [warranty, setWarranty] = useState(
    qWarranty === 6 || qWarranty === 12 ? qWarranty : 0
  );
  const [inStockOnly, setInStockOnly] = useState(qStock === "in");
  const [sortKey, setSortKey] = useState(qSort);
  const [selVariant, setSelVariant] = useState(qVariant);
  const [selColor, setSelColor] = useState(qColor);

  /* URL helpers */
  const clearAll = () => {
    // Also reset UI immediately (works for empty-state reset button)
    setPriceRange([minPrice, maxPrice]);
    setWarranty(0);
    setInStockOnly(false);
    setSelVariant([]);
    setSelColor([]);
    setSortKey("relevance");

    lastWrittenQS.current = "";
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };
  const clearParam = (key) => {
    const spNow = new URLSearchParams(searchStr);
    spNow.delete(key);
    const qs = spNow.toString();
    lastWrittenQS.current = normalizeQS(qs);
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  /* Detect real URL qs changes and reset one-shot sync */
  useEffect(() => {
    const curr = normalizeQS(searchStr);
    const prev = normalizeQS(prevURLQS.current);
    if (curr !== prev) {
      prevURLQS.current = searchStr;
      firstSyncDone.current = false;
    }
  }, [searchStr]);

  /* URL -> UI (once per URL change; skip if it's our own write) */
  useEffect(() => {
    if (!boundsReady) return;

    const curr = normalizeQS(searchStr);
    if (curr === lastWrittenQS.current) return; // our own write
    if (firstSyncDone.current) return; // already synced for this URL

    // Parse desired UI from URL
    let nextPrice = [minPrice, maxPrice];
    if (qPrice?.includes("-")) {
      const [a, b] = qPrice.split("-").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        nextPrice = [
          clamp(a, minPrice, maxPrice),
          clamp(b, minPrice, maxPrice),
        ];
      }
    }
    const nextWarranty = qWarranty === 6 || qWarranty === 12 ? qWarranty : 0;
    const nextStock = qStock === "in";
    const nextSort = qSort || "relevance";

    // Apply only if different (prevents pointless renders)
    setPriceRange((prev) =>
      prev[0] !== nextPrice[0] || prev[1] !== nextPrice[1] ? nextPrice : prev
    );
    setWarranty((prev) => (prev !== nextWarranty ? nextWarranty : prev));
    setInStockOnly((prev) => (prev !== nextStock ? nextStock : prev));
    setSortKey((prev) => (prev !== nextSort ? nextSort : prev));
    setSelVariant((prev) => (arraysEqual(prev, qVariant) ? prev : qVariant));
    setSelColor((prev) => (arraysEqual(prev, qColor) ? prev : qColor));

    firstSyncDone.current = true;
  }, [
    boundsReady,
    searchStr,
    qPrice,
    qWarranty,
    qStock,
    qSort,
    qVariant,
    qColor,
    minPrice,
    maxPrice,
  ]);

  /* UI -> URL (only if desired qs differs from current, and after first URL->UI sync) */
  const priceDebounced = useDebounced(priceRange, 220);
  useEffect(() => {
    if (!boundsReady) return;
    if (!firstSyncDone.current) return;

    const desired = {
      ...(priceDebounced[0] === minPrice && priceDebounced[1] === maxPrice
        ? {}
        : {
            price: `${clamp(priceDebounced[0], minPrice, maxPrice)}-${clamp(
              priceDebounced[1],
              minPrice,
              maxPrice
            )}`,
          }),
      ...(warranty === 6 || warranty === 12
        ? { warranty: String(warranty) }
        : {}),
      ...(inStockOnly ? { stock: "in" } : {}),
      ...(sortKey ? { sort: sortKey } : {}),
      ...(selVariant.length ? { variant: selVariant.join(",") } : {}),
      ...(selColor.length ? { color: selColor.join(",") } : {}),
    };

    const desiredQS = normalizeQS(toSortedQS(desired));
    const currentQS = normalizeQS(searchStr);

    if (desiredQS !== currentQS) {
      lastWrittenQS.current = desiredQS;
      startTransition(() => {
        router.replace(desiredQS ? `${pathname}?${desiredQS}` : pathname, {
          scroll: false,
        });
      });
    }
  }, [
    boundsReady,
    pathname,
    router,
    searchStr,
    minPrice,
    maxPrice,
    priceDebounced[0],
    priceDebounced[1],
    warranty,
    inStockOnly,
    sortKey,
    selVariant.join(","),
    selColor.join(","),
  ]);

  /* aggregates for variant filters */
  const { variantAgg, colorAgg } = useMemo(() => {
    const vMap = new Map();
    const cMap = new Map();
    for (const p of baseProducts) {
      const variants = Array.isArray(p?.variants) ? p.variants : [];
      for (const v of variants) {
        const label = (v?.variantName || v?.sku || "").toString().trim();
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
      colorAgg: Array.from(cMap, ([label, count]) => ({ label, count })),
    };
  }, [baseProducts]);

  /* chips */
  const chips = useMemo(() => {
    const list = [];
    if (qPrice?.includes("-")) {
      const [a, b] = qPrice.split("-").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b))
        list.push({
          key: "price",
          label: `${fmtRs(a)} – ${fmtRs(b)}`,
          clear: () => clearParam("price"),
        });
    }
    if (qWarranty === 6 || qWarranty === 12)
      list.push({
        key: "warranty",
        label: `Warranty ≥ ${qWarranty}m`,
        clear: () => clearParam("warranty"),
      });
    if (qStock === "in")
      list.push({
        key: "stock",
        label: "In stock",
        clear: () => clearParam("stock"),
      });
    for (const v of selVariant)
      list.push({
        key: `v:${v}`,
        label: v,
        clear: () => setSelVariant((s) => s.filter((x) => x !== v)),
      });
    for (const c of selColor)
      list.push({
        key: `c:${c}`,
        label: c,
        clear: () => setSelColor((s) => s.filter((x) => x !== c)),
      });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qPrice, qWarranty, qStock, selVariant, selColor]);

  const isFilterActive = chips.length > 0;

  /* filter + sort */
  const items = useMemo(() => {
    let list = baseProducts.slice();
    const [low, high] = priceRange;
    list = list.filter((p) => {
      const pr = priceOf(p);
      return Number.isFinite(pr) && pr >= low && pr <= high;
    });
    if (warranty === 6 || warranty === 12)
      list = list.filter((p) => Number(p?.warrantyMonths) >= warranty);
    if (inStockOnly) list = list.filter((p) => Number(p?.stock) > 0);
    if (selVariant.length) {
      list = list.filter((p) => {
        const names = new Set(
          (p?.variants || [])
            .map((v) => (v?.variantName || v?.sku || "").toString().trim())
            .filter(Boolean)
        );
        return selVariant.every((v) => names.has(v));
      });
    }
    if (selColor.length) {
      list = list.filter((p) => {
        const colors = new Set(
          (p?.variants || [])
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
      // relevance (API order)
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

  /* animations */
  const fadeUp = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
  };
  const listIn = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  };

  /* mobile drawer */
  const [openSheet, setOpenSheet] = useState(false);

  return (
    <main
      className="min-h-screen w-full"
      style={{
        /* subtle #fcba17 gradient */
        background:
          "linear-gradient(140deg, rgba(252,186,23,0.018) 0%, rgba(252,186,23,0.012) 20%, transparent 60%)",
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
              {/* toolbar */}
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

              {/* mobile chips */}
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
                    key={normalizeQS(
                      toSortedQS({
                        qs: searchStr,
                        sortKey,
                        v: selVariant.join(","),
                        c: selColor.join(","),
                        len: String(items.length),
                      })
                    )}
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
                  onReset={clearAll}
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
