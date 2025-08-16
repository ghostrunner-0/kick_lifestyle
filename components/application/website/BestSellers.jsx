// components/application/website/BestSellers.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

function deriveKey(c) {
  return c?.slug ?? c?.id ?? c?._id ?? (c?.name || "").toLowerCase();
}

/**
 * props:
 * - categories: Array<{ id?: string; _id?: string; slug?: string; name: string }>
 * - initialActive?: string (slug/id/_id/name key)
 * - onChange?: (key: string) => void
 * - className?: string
 */
export default function BestSellers({
  categories = [],
  initialActive,
  onChange,
  className = "",
}) {
  const catKeys = useMemo(() => categories.map(deriveKey), [categories]);
  const firstKey = catKeys[0];
  const [active, setActive] = useState(initialActive ?? firstKey);

  // Keep active stable across category updates. If current active no longer exists,
  // prefer initialActive, else fallback to firstKey. (No auto-calling onChange here)
  useEffect(() => {
    const desired = initialActive ?? firstKey;
    setActive((prev) => {
      if (!desired && !prev) return prev;        // nothing yet
      if (prev && catKeys.includes(prev)) return prev; // keep if valid
      return desired ?? prev ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(catKeys), initialActive, firstKey]);

  // Only call onChange on explicit user selection to avoid double calls
  const select = (key) => {
    if (key === active) return;
    setActive(key);
    onChange?.(key);
  };

  if (!categories.length) return null;

  return (
    <div className={`px-5 py-5 ${className}`}>
      <div className="flex items-center gap-4">
        <h2 className="shrink-0 text-base sm:text-lg font-semibold tracking-tight text-slate-900">
          Explore Our Best Sellers
        </h2>

        {/* Pills container pinned to the end */}
        <div
          className="ml-auto min-w-0 flex items-center gap-4 overflow-x-auto pr-2 -mr-2 justify-end"
          style={{ scrollbarWidth: "none" }}
          aria-label="Category filter"
        >
          <style jsx>{`
            div[aria-label='Category filter']::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {categories.map((cat, i) => {
            const key = catKeys[i];
            const isActive = key === active;

            return (
              <Button
                key={key || i}
                type="button"
                onClick={() => select(key)}
                aria-pressed={isActive}
                variant="ghost"
                className={[
                  "rounded-full h-10 px-6 text-[15px] font-semibold whitespace-nowrap border",
                  isActive
                    ? "bg-[#fcba17] hover:bg-[#e9ae12] text-slate-900 border-[#e9ae12]"
                    : "bg-[#FFF3C2] hover:bg-[#FFE9A6] text-slate-900 border-[#F9D886]",
                ].join(" ")}
              >
                {cat.name}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
