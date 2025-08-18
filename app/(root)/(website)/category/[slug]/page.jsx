// app/category/[slug]/page.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProductGrid from "@/components/application/website/ProductGrid";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";

import FiltersSidebar from "@/components/application/website/FiltersSidebar";
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

/* ---------- helpers ---------- */
const toTitle = (s) =>
  (s || "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

export default function CategoryPage({ params }) {
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
  const bannerAlt = category?.banner?.alt || `${title} banner`;

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

  return (
    <main>
      {/* ---------- Banner (1600×400) ---------- */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b0f] via-[#0b0b0f] to-[#111827]" />
        <div className="relative mx-auto max-w-[1600px] [padding-inline:clamp(1rem,5vw,6rem)]">
          {bannerSrc ? (
            <div className="relative aspect-[4/1] rounded-md overflow-hidden shadow-sm">
              <Image
                src={bannerSrc}
                alt={bannerAlt}
                fill
                priority
                fetchPriority="high"
                quality={92}
                sizes="(min-width:1600px) 1600px, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="relative min-h-[220px] lg:min-h-[280px] rounded-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0f] to-[#111827]" />
              <div className="relative flex items-center">
                <div className="py-10 lg:py-14">
                  <h1 className="text-white text-3xl lg:text-5xl font-bold tracking-tight">
                    {title}
                  </h1>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Filters (Sheet) + Grid ---------- */}
      <section className="w-full">
        <div className="mx-auto max-w-[1600px] [padding-inline:clamp(1rem,5vw,6rem)] py-6 lg:py-8">
          {/* top bar: filter trigger + selected chips + reset */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
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
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <FiltersSidebar
                      ref={filtersRef}
                      slug={slug}
                      products={Array.isArray(products) ? products : []}
                      loading={!!prodLoading}
                      hideHeader
                      open={open}
                    />
                  </div>

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

              {/* selected filter chips */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 overflow-hidden">
                  {chips.map((chip) => (
                    <Button
                      key={chip.key}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 rounded-full px-3 py-0 text-xs"
                      onClick={chip.onRemove}
                      title={`Remove ${chip.label}`}
                    >
                      {chip.label}
                      <X className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {isFilterActive() && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-8"
                onClick={clearAll}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>

          {/* product grid */}
          <ProductGrid loading={prodLoading || catLoading} />
        </div>
      </section>
    </main>
  );
}
  