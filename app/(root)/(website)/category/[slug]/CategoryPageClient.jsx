// app/(root)/(website)/category/[slug]/CategoryPageClient.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import ProductGrid from "@/components/application/website/ProductGrid";
import FiltersSidebar from "@/components/application/website/FiltersSidebar";

import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Funnel, X, RotateCcw } from "lucide-react";

/* ✨ Reusable animated hero */
import TitleCard from "@/components/application/TitleCard";

/* Framer Motion */
import { motion, AnimatePresence } from "framer-motion";

/* ---------- helpers ---------- */
const toTitle = (s = "") =>
  s.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (m) => m.toUpperCase());

const ACCENT = "#fcba17";

/* ---------- animation variants ---------- */
const fadeInUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut", delay } },
});
const staggerContainer = (stagger = 0.06, delay = 0) => ({
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: stagger, delayChildren: delay, duration: 0.35, ease: "easeOut" },
  },
});
const chipVariant = {
  hidden: { opacity: 0, scale: 0.95, y: 4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.2 } },
};

export default function CategoryPageClient({ params }) {
  const slug = params?.slug;

  // data providers
  const { categories, isLoading: catLoading } = useCategories();
  const { setActiveKey, isLoading: prodLoading, products } = useProducts();

  // routing / query helpers
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // filter sheet
  const [open, setOpen] = useState(false);
  const filtersRef = useRef(null);

  // fetch products for this category
  useEffect(() => {
    if (slug) setActiveKey(slug);
  }, [slug, setActiveKey]);

  // category + banner
  const category = useMemo(
    () => categories?.find((c) => deriveKey(c) === slug),
    [categories, slug]
  );
  const title = category?.name || toTitle(slug || "");
  const bannerSrc = category?.banner?.path || null;
  const subtitle =
    typeof category?.description === "string" && category.description.trim().length
      ? category.description.trim()
      : undefined;

  /* ---------- query helpers ---------- */
  const removeParam = (key) => {
    const sp = new URLSearchParams(search.toString());
    sp.delete(key);
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const clearAll = () => {
    const sp = new URLSearchParams(search.toString());
    ["price", "warranty", "stock"].forEach((k) => sp.delete(k));
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const isFilterActive = () => {
    const price = search.get("price");
    const w = Number(search.get("warranty"));
    const st = search.get("stock");
    return (!!price && price.includes("-")) || w === 6 || w === 12 || st === "in";
  };

  const chips = useMemo(() => {
    const list = [];
    const price = search.get("price");
    if (price) {
      const [a, b] = price.split("-").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        list.push({
          key: "price",
          label: `Rs. ${a.toLocaleString("en-IN")} – ${b.toLocaleString("en-IN")}`,
          onRemove: () => removeParam("price"),
        });
      }
    }
    const w = Number(search.get("warranty"));
    if (w === 6 || w === 12) {
      list.push({
        key: "warranty",
        label: `Warranty ≥ ${w}m`,
        onRemove: () => removeParam("warranty"),
      });
    }
    const st = search.get("stock");
    if (st === "in") {
      list.push({
        key: "stock",
        label: "In stock",
        onRemove: () => removeParam("stock"),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // key to re-run grid entrance animation when filters change
  const gridAnimKey = `${slug}|${search.toString()}`;

  return (
    <main>
      {/* ---------- Hero (TitleCard + entrance) ---------- */}
      <section className="relative w-full">
        <div className="relative mx-auto max-w-[1600px] [padding-inline:clamp(1rem,5vw,6rem)] py-3">
          <motion.div variants={fadeInUp(0.02)} initial="hidden" animate="show">
            <TitleCard
              title={title}
              subtitle={subtitle}
              badge="Category"
              accent={ACCENT}
              variant={bannerSrc ? "image" : "solid"}
              imageUrl={bannerSrc || undefined}
              align="left"
              size="md"
              pattern={bannerSrc ? "none" : "grid"}
              className={bannerSrc ? "text-white" : ""}
            />
          </motion.div>
        </div>
      </section>

      {/* ---------- Filters (Sheet) + Grid ---------- */}
      <section className="w-full">
        <div className="mx-auto max-w-[1600px] [padding-inline:clamp(1rem,5vw,6rem)] py-6 lg:py-8">
          {/* top bar: filter trigger + selected chips + reset */}
          <motion.div
            variants={staggerContainer(0.05, 0.02)}
            initial="hidden"
            animate="show"
            className="mb-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <motion.div variants={fadeInUp(0.04)}>
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="shrink-0">
                      <Funnel className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>

                  {/* Hide shadcn default close so only our X shows */}
                  <SheetContent
                    side="left"
                    className="w-[86%] sm:w-[420px] p-0 h-dvh max-h-dvh flex flex-col [&>button.absolute.right-4.top-4]:hidden"
                  >
                    {/* our single close button */}
                    <SheetClose asChild>
                      <button
                        onClick={() => setOpen(false)}
                        aria-label="Close"
                        className="absolute right-3 top-3 z-10 rounded-md p-2 text-foreground/80 hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                      </button>
                    </SheetClose>

                    <SheetHeader className="px-4 py-3 border-b">
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>

                    {/* scrollable content */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex-1 overflow-y-auto px-4 py-4"
                    >
                      <FiltersSidebar
                        ref={filtersRef}
                        slug={slug}
                        products={Array.isArray(products) ? products : []}
                        loading={!!prodLoading}
                        hideHeader
                        open={open}
                      />
                    </motion.div>

                    {/* pinned footer */}
                    <div className="px-4 pb-4 pt-3 border-t">
                      <Button
                        className="w-full"
                        type="button"
                        onClick={() => {
                          filtersRef.current?.apply?.();
                          setOpen(false);
                        }}
                      >
                        Apply & Close
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </motion.div>

              {/* selected filter chips */}
              <motion.div variants={fadeInUp(0.06)} className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 overflow-hidden">
                  <AnimatePresence initial={false}>
                    {chips.map((chip) => (
                      <motion.button
                        key={chip.key}
                        type="button"
                        layout
                        variants={chipVariant}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="inline-flex items-center h-7 rounded-full bg-secondary px-3 py-0 text-xs hover:bg-secondary/80"
                        onClick={chip.onRemove}
                        title={`Remove ${chip.label}`}
                      >
                        {chip.label}
                        <X className="ml-2 h-3.5 w-3.5" />
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            <AnimatePresence>
              {isFilterActive() && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <Button variant="ghost" size="sm" className="shrink-0 h-8" onClick={clearAll}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* product grid (cross-fade on filter changes) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={gridAnimKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <ProductGrid loading={prodLoading || catLoading} />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
