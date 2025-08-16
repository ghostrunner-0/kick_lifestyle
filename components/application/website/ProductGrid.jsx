"use client";

import React, { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { useProducts } from "@/components/providers/ProductProvider";

const SkeletonCard = () => (
  <div
    role="status"
    aria-live="polite"
    className={[
      "relative overflow-hidden rounded-2xl bg-white",
      "border border-slate-200/60 dark:bg-neutral-900 dark:border-neutral-800",
      "animate-pulse",
    ].join(" ")}
  >
    {/* Media */}
    <div className="relative aspect-square md:aspect-[4/5]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[70%] w-[80%] rounded-md bg-slate-200 dark:bg-neutral-700" />
      </div>
    </div>

    {/* Info */}
    <div className="p-3 sm:p-4">
      {/* Title + variants */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-neutral-700" />
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-neutral-700" />
          <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-neutral-700" />
          <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-neutral-700" />
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 rounded bg-slate-200 dark:bg-neutral-700" />
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-neutral-700" />
      </div>

      {/* CTA */}
      <div className="mt-3 h-9 w-full rounded-full bg-slate-200 dark:bg-neutral-700" />

      <span className="sr-only">Loading product…</span>
    </div>
  </div>
);

/**
 * Props:
 * - products?: Product[]
 * - loading?: boolean
 * - className?: string
 * - onAddToCart?: (payload) => void
 * - onVariantChange?: (variant|null, product) => void
 *
 * If props are omitted, falls back to ProductProvider (context).
 */
export default function ProductGrid({
  products,
  loading,
  className = "",
  onAddToCart,
  onVariantChange,
}) {
  // Fallback to context (so you can reuse this grid across pages without props)
  const { products: ctxProducts, isLoading: ctxLoading } = useProducts();

  const items = useMemo(
    () => (Array.isArray(products) ? products : ctxProducts || []),
    [products, ctxProducts]
  );
  const isLoading = loading ?? ctxLoading ?? false;

  // Fade in when loading flips to false
  const [fadeIn, setFadeIn] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      const id = requestAnimationFrame(() => setFadeIn(true));
      return () => cancelAnimationFrame(id);
    }
    setFadeIn(false);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 p-4 ${className}`}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
    }

  if (!items.length) {
    return (
      <div className="py-10 text-center text-gray-500">No products found.</div>
    );
  }

  return (
    <div
      className={[
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 p-4",
        "opacity-0 transition-opacity duration-500 ease-out",
        "motion-reduce:transition-none motion-reduce:opacity-100",
        fadeIn ? "opacity-100" : "opacity-0",
        className,
      ].join(" ")}
    >
      {items.map((p) => (
        <ProductCard
          key={p._id || p.slug}
          product={p}
          onAddToCart={onAddToCart}
          onVariantChange={(v) => onVariantChange?.(v, p)}
        />
      ))}
    </div>
  );
}
