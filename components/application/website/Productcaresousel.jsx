"use client";

import React from "react";

/**
 * Lightweight horizontal carousel (no arrows).
 * - Mobile: 1 card per view
 * - sm/md/xl: 2 / 3 / 4 cards visible
 * - Keeps your exact gap and container padding
 */
export default function Productcaresousel({
  items = [],
  renderItem,                 // (item, i) => node
  loading = false,
  skeletonCount = 8,
  Skeleton = DefaultSkeleton,
  gapClass = "gap-6",         // keep same spacing as your grid
  itemBasisClass = "basis-full sm:basis-1/2 md:basis-1/3 xl:basis-1/4", // 1/2/3/4 cols
  className = "",
  trackClassName = "",
}) {
  return (
    <div className={className}>
      <div
        // explicit styles help older iOS/Android browsers
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        className={[
          "flex overflow-x-auto scroll-smooth",
          "snap-x snap-mandatory snap-always", // snap to each card
          "touch-pan-x overscroll-x-contain",  // reliable horizontal swipe on mobile
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          gapClass,
          "pl-0", // no extra start space
          trackClassName,
        ].join(" ")}
      >
        {(loading ? Array.from({ length: skeletonCount }) : items).map((item, i) => (
          <div
            key={i}
            className={["shrink-0 snap-start", itemBasisClass].join(" ")}
          >
            {loading ? <Skeleton /> : renderItem?.(item, i)}
          </div>
        ))}
      </div>
    </div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="h-[340px] md:h-[380px] rounded-2xl bg-slate-100 animate-pulse" />
  );
}
