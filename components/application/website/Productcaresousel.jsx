"use client";

import React from "react";

/**
 * Ultra-stable horizontal carousel (no arrows).
 * - Mobile: 1 card per view
 * - sm/md/xl: 2 / 3 / 4
 * - No extra start/end space: negative wrapper margins cancel per-slide padding
 * - Keeps parent/container paddings exactly as-is
 */
export default function Productcaresousel({
  items = [],
  renderItem,                   // (item, i) => node
  loading = false,
  skeletonCount = 8,
  Skeleton = DefaultSkeleton,
  itemBasisClass = "basis-full sm:basis-1/2 md:basis-1/3 xl:basis-1/4",
  className = "",
  trackClassName = "",
}) {
  const data = loading ? Array.from({ length: skeletonCount }) : items;

  return (
    <div className={className}>
      {/* Trim edges so the first/last slide sit flush with the container */}
      <div className="-mx-3">
        <div
          role="region"
          aria-roledescription="carousel"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
          className={[
            "overflow-x-auto scroll-smooth",
            "touch-pan-x overscroll-x-contain",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            trackClassName,
          ].join(" ")}
        >
          <div className="flex snap-x snap-mandatory snap-always min-w-0">
            {data.map((item, i) => (
              <div
                key={i}
                className={[
                  "shrink-0 snap-start min-w-0",
                  itemBasisClass,
                  // visual spacing between slides = 24px (like gap-6)
                  "px-3",
                ].join(" ")}
                style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
              >
                {loading ? <Skeleton /> : renderItem?.(item, i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="h-[340px] md:h-[380px] rounded-2xl bg-slate-100 animate-pulse" />
  );
}
