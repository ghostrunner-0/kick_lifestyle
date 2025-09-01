"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/application/website/ProductCard";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";
import { motion, AnimatePresence } from "framer-motion";
import Productcaresousel from "./Productcaresousel";

/* de-dup */
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

const PillSkeleton = () => (
  <span className="h-9 sm:h-10 w-24 rounded-full bg-slate-100 animate-pulse" />
);

/* minimal motion for header */
const fade = { hidden: { opacity: 0 }, show: { opacity: 1 } };

export default function BestSellers({ className = "" }) {
  const { categories = [], isLoading: catLoading } = useCategories();
  const {
    products = [],
    isLoading: prodLoading,
    activeKey,
    setActiveKey,
  } = useProducts();

  const catKeys = useMemo(
    () => (Array.isArray(categories) ? categories.map(deriveKey) : []),
    [categories]
  );

  const displayProducts = useMemo(() => {
    const uniq = dedupeByCanonical(products || []);
    return uniq.slice(0, 24);
  }, [products]);

  if (!categories?.length && !catLoading) return null;

  return (
    <section className={"py-8 " + className}>
      {/* keep exact container paddings */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row (title only now) */}
        <motion.div
          variants={fade}
          initial="hidden"
          animate="show"
          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
        >
          <h2
            className="shrink-0 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
            title="Top Picks For You"
          >
            Top Picks For You
          </h2>
        </motion.div>
        {/* Category pills moved to bottom */}
        <div className="mt-6">
          <div
            role="tablist"
            aria-label="Category filter"
            className="flex gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden pr-2 -mr-2 py-1 snap-x snap-mandatory no-scrollbar"
          >
            {catLoading && !categories.length
              ? Array.from({ length: 4 }).map((_, i) => (
                  <PillSkeleton key={i} />
                ))
              : (categories || []).map((cat, i) => {
                  const key = catKeys[i];
                  const isActive = key === activeKey;
                  return (
                    <Button
                      key={key || i}
                      type="button"
                      role="tab"
                      aria-selected={!!isActive}
                      onClick={() => key && setActiveKey(key)}
                      variant="ghost"
                      className={
                        "snap-start shrink-0 min-w-max rounded-full h-9 sm:h-10 px-4 sm:px-6 text-[14px] sm:text-[15px] font-semibold whitespace-nowrap border transition-colors " +
                        (isActive
                          ? "bg-[#fcba17] hover:bg-[#e9ae12] text-slate-900 border-[#e9ae12]"
                          : "bg-[#FFF3C2] hover:bg-[#FFE9A6] text-slate-900 border-[#F9D886]")
                      }
                    >
                      {cat?.name || "Category"}
                    </Button>
                  );
                })}
          </div>
        </div>
        {/* Carousel */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {!displayProducts.length && !prodLoading ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No products found.
              </motion.div>
            ) : (
              <motion.div
                key={activeKey || "carousel"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Productcaresousel
                  items={displayProducts}
                  loading={prodLoading}
                  skeletonCount={8}
                  /* match old grid spacing and columns */
                  gapClass="gap-6"
                  itemBasisClass="basis-full sm:basis-1/2 md:basis-1/3 xl:basis-1/4"
                  renderItem={(p) => (
                    <div className="h-full">
                      <ProductCard product={p} />
                    </div>
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
