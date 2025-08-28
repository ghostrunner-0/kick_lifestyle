"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/application/website/ProductCard";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";
import { motion, AnimatePresence } from "framer-motion";

/* de-dup */
const canonicalKey = (p) => {
  if (!p) return null;
  const slug = p.slug || p.handle || p.data?.slug || p.productSlug || p.seo?.slug;
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

/* motion */
const gridVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, when: "beforeChildren" } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

export default function BestSellers({ className = "" }) {
  const { categories = [], isLoading: catLoading } = useCategories();
  const { products = [], isLoading: prodLoading, activeKey, setActiveKey } = useProducts();

  const catKeys = useMemo(
    () => (Array.isArray(categories) ? categories.map(deriveKey) : []),
    [categories]
  );

  const displayProducts = useMemo(() => {
    if (prodLoading) return Array.from({ length: 8 }).map(() => null);
    const uniq = dedupeByCanonical(products);
    return uniq.slice(0, 24);
  }, [prodLoading, products]);

  if (!categories?.length && !catLoading) return null;

  return (
    <section className={"py-8 " + className}>
      {/* ⬇️ widened to match Header (1600px max with gutters) */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h2 className="shrink-0 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900" title="Top Picks For You">
            Top Picks For You
          </h2>

          {/* Tabs */}
          <div className="sm:ml-auto relative">
            <div
              role="tablist"
              aria-label="Category filter"
              className="flex gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden pr-2 -mr-2 py-1 snap-x snap-mandatory no-scrollbar"
            >
              {catLoading && !categories.length
                ? Array.from({ length: 4 }).map((_, i) => <PillSkeleton key={i} />)
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
        </div>

        {/* Products grid — original card size (1/2/3/4 columns) */}
        <div className="mt-6">
          <AnimatePresence mode="popLayout">
            {displayProducts.length === 0 && !prodLoading ? (
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
                key={activeKey || "grid"}
                variants={gridVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="
                  grid gap-6
                  grid-cols-1
                  sm:grid-cols-2
                  md:grid-cols-3
                  xl:grid-cols-4
                "
              >
                {displayProducts.map((p, i) => (
                  <motion.div variants={cardVariants} key={(p && canonicalKey(p)) || `skeleton-${i}`} className="h-full">
                    {prodLoading || !p ? (
                      <div className="h-[340px] md:h-[380px] rounded-2xl bg-slate-100 animate-pulse" />
                    ) : (
                      <div className="h-full">
                        <ProductCard product={p} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
