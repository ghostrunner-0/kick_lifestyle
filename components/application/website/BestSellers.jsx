// components/application/website/BestSellers.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/application/website/ProductCard";

function deriveKey(c) {
  return c?.slug ?? c?.id ?? c?._id ?? (c?.name || "").toLowerCase();
}

export default function BestSellers({
  categories = [],
  products = [],
  loading = false,
  initialActive,
  onChange,
  className = "",
}) {
  const catKeys = useMemo(() => categories.map(deriveKey), [categories]);
  const firstKey = catKeys[0];
  const [active, setActive] = useState(initialActive ?? firstKey);

  useEffect(() => {
    const desired = initialActive ?? firstKey;
    setActive((prev) => {
      if (!desired && !prev) return prev;
      if (prev && catKeys.includes(prev)) return prev;
      return desired ?? prev ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(catKeys), initialActive, firstKey]);

  const select = (key) => {
    if (key === active) return;
    setActive(key);
    onChange?.(key);
  };

  if (!categories.length) return null;

  // ✅ Build display list
  const displayProducts = useMemo(() => {
    if (loading) return Array.from({ length: 6 }).map(() => null);
    if (!products?.length) return [];
    if (products.length === 1) return Array.from({ length: 10 }, () => products[0]); // repeat for testing
    return products;
  }, [loading, products]);

  return (
    <section className={"px-4 sm:px-6 lg:px-8 py-6 " + className}>
      <div className="max-w-[1280px] mx-auto">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h2
            className="shrink-0 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 truncate"
            title="Top Picks For You"
          >
            Top Picks For You
          </h2>

          {/* Tabs */}
          <div className="sm:ml-auto relative">
            <div
              role="tablist"
              aria-label="Category filter"
              className="flex gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden pr-2 -mr-2 py-1 snap-x snap-mandatory no-scrollbar"
            >
              {categories.map((cat, i) => {
                const key = catKeys[i];
                const isActive = key === active;
                return (
                  <Button
                    key={key || i}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => select(key)}
                    variant="ghost"
                    className={
                      "snap-start shrink-0 min-w-max rounded-full h-9 sm:h-10 px-4 sm:px-6 text-[14px] sm:text-[15px] font-semibold whitespace-nowrap border transition-colors " +
                      (isActive
                        ? "bg-[#fcba17] hover:bg-[#e9ae12] text-slate-900 border-[#e9ae12]"
                        : "bg-[#FFF3C2] hover:bg-[#FFE9A6] text-slate-900 border-[#F9D886]")
                    }
                  >
                    {cat.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product row */}
        <div className="mt-5 -mx-2 sm:mx-0">
          <div className="flex gap-4 sm:gap-5 overflow-x-auto overflow-y-hidden px-2 sm:px-0 snap-x snap-mandatory no-scrollbar">
            {displayProducts.map((p, i) => (
              <div
                key={(p && (p._id || p.id || p.slug)) || i}
                className="snap-start shrink-0 w-[78%] sm:w-[48%] md:w-[38%] lg:w-[30%] xl:w-[23%] 2xl:w-[20%]"
              >
                {loading ? (
                  <div className="h-[340px] md:h-[380px] rounded-2xl bg-slate-100 animate-pulse" />
                ) : (
                  <ProductCard product={p} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
