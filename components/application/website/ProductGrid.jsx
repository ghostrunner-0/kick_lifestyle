"use client";

import React, { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { useProducts } from "@/components/providers/ProductProvider";

/* canonical de-dup (same as BestSellers) */
const canonicalKey = (p) => {
  if (!p) return null;
  const slug = p.slug || p.handle || p?.data?.slug || p.productSlug || p?.seo?.slug;
  if (slug) return `slug:${String(slug).toLowerCase()}`;
  const parent = p.parentId || p.productId || p.pid || p.masterId || p.groupId;
  if (parent) return `pid:${parent}`;
  const name = (p.name || p.title || "").trim().toLowerCase();
  const basePrice = p.specialPrice ?? p.price ?? p.mrp ?? p?.data?.price ?? "";
  return `name:${name}|price:${basePrice}`;
};
const dedupe = (arr) => {
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

const SkeletonCard = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 dark:bg-neutral-900 dark:border-neutral-800 animate-pulse">
    <div className="relative aspect-square md:aspect-[4/5]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[70%] w-[80%] rounded-md bg-slate-200 dark:bg-neutral-700" />
      </div>
    </div>
    <div className="p-3 sm:p-4">
      <div className="mb-2 h-4 w-2/3 rounded bg-slate-200 dark:bg-neutral-700" />
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 rounded bg-slate-200 dark:bg-neutral-700" />
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-neutral-700" />
      </div>
      <div className="mt-3 h-9 w-full rounded-full bg-slate-200 dark:bg-neutral-700" />
    </div>
  </div>
);

export default function ProductGrid({
  products,
  loading,
  className = "",
  onAddToCart,
  onVariantChange,
}) {
  const { products: ctxProducts, isLoading: ctxLoading } = useProducts();

  const raw = useMemo(
    () => (Array.isArray(products) ? products : ctxProducts || []),
    [products, ctxProducts]
  );
  const items = useMemo(() => dedupe(raw), [raw]);
  const isLoading = loading ?? ctxLoading ?? false;

  // fade-in
  const [fadeIn, setFadeIn] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      const id = requestAnimationFrame(() => setFadeIn(true));
      return () => cancelAnimationFrame(id);
    }
    setFadeIn(false);
  }, [isLoading]);

  const GridWrapper = ({ children }) => (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );

  if (isLoading) {
    return (
      <GridWrapper>
        <div
          className={`grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 ${className}`}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </GridWrapper>
    );
  }

  if (!items.length) {
    return (
      <GridWrapper>
        <div className="py-10 text-center text-gray-500">No products found.</div>
      </GridWrapper>
    );
  }

  return (
    <GridWrapper>
      <div
        className={[
          "grid gap-6",
          // ⬇️ restored original sizing: 1 → 2 → 3 → 4 columns
          "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
          "opacity-0 transition-opacity duration-500 ease-out",
          "motion-reduce:transition-none motion-reduce:opacity-100",
          fadeIn ? "opacity-100" : "opacity-0",
          className,
        ].join(" ")}
      >
        {items.map((p) => (
          <ProductCard
            key={canonicalKey(p)}
            product={p}
            onAddToCart={onAddToCart}
            onVariantChange={(v) => onVariantChange?.(v, p)}
          />
        ))}
      </div>
    </GridWrapper>
  );
}
