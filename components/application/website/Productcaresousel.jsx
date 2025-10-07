"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Ultra-stable horizontal carousel (no arrows).
 * - Mobile: 1 card; sm/md/xl: 2 / 3 / 4 (configurable via itemBasisClass)
 * - No start/end gutter: negative wrapper margins cancel per-slide padding
 * - Smooth, snap-aligned, keyboard & touch friendly
 * - Subtle trackless progress bar (thumb only)
 */
export default function Productcaresousel({
  items = [],
  renderItem,                    // (item, i) => node
  loading = false,
  skeletonCount = 8,
  Skeleton = DefaultSkeleton,
  itemBasisClass = "basis-full sm:basis-1/2 md:basis-1/3 xl:basis-1/4",
  className = "",
  trackClassName = "",
  ariaLabel = "Products",
  onIndexChange,                 // (index) => void
}) {
  const data = loading ? Array.from({ length: skeletonCount }) : items;
  const scrollerRef = useRef(null);
  const slidesRef = useRef([]);
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(() => (data?.length || 0));
  const [progress, setProgress] = useState(0); // 0..1

  // Reset slide refs when data length changes
  useEffect(() => {
    slidesRef.current = Array(data.length).fill(null);
    setCount(data.length);
  }, [data.length]);

  // RTL support
  const isRTL = typeof document !== "undefined" && getComputedStyle(document.documentElement).direction === "rtl";

  // Compute scroll progress (0..1)
  const computeProgress = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return 0;
    const pos = isRTL ? (max + el.scrollLeft) * -1 : el.scrollLeft;
    const clamped = Math.max(0, Math.min(1, pos / max));
    return clamped;
  }, [isRTL]);

  // Find nearest snap index by measuring slide offsets
  const computeIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !slidesRef.current.length) return 0;
    const viewportLeft = el.scrollLeft;
    let nearest = 0;
    let best = Infinity;

    slidesRef.current.forEach((node, i) => {
      if (!node) return;
      const offset = node.offsetLeft - el.offsetLeft; // left within scroller
      const dist = Math.abs(offset - viewportLeft);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    return nearest;
  }, []);

  // Scroll handler
  const onScroll = useCallback(() => {
    setProgress(computeProgress());
    const idx = computeIndex();
    setIndex((prev) => {
      if (prev !== idx) onIndexChange?.(idx);
      return idx;
    });
  }, [computeProgress, computeIndex, onIndexChange]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [onScroll]);

  // Keyboard support
  const onKeyDown = (e) => {
    const el = scrollerRef.current;
    if (!el || !count) return;

    const snapTo = (i) => {
      const target = slidesRef.current[i];
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    };

    const step = () => {
      const next = Math.min(count - 1, index + 1);
      snapTo(next);
    };
    const prev = () => {
      const next = Math.max(0, index - 1);
      snapTo(next);
    };

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        isRTL ? prev() : step();
        break;
      case "ArrowLeft":
        e.preventDefault();
        isRTL ? step() : prev();
        break;
      case "Home":
        e.preventDefault();
        snapTo(0);
        break;
      case "End":
        e.preventDefault();
        snapTo(count - 1);
        break;
      case "PageDown":
        e.preventDefault();
        snapTo(Math.min(count - 1, index + 3));
        break;
      case "PageUp":
        e.preventDefault();
        snapTo(Math.max(0, index - 3));
        break;
    }
  };

  // Support horizontal trackpad / shift+wheel
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      // If there's a horizontal delta, use it; otherwise if shift is held, convert vertical to horizontal.
      const dx = Math.abs(e.deltaX) > 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (dx === 0) return;
      e.preventDefault();
      el.scrollBy({ left: dx, behavior: "auto" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Progress thumb sizing
  const thumbPct = count > 0 ? Math.min(100, 100 / count) : 100;
  const leftPct = Math.max(0, Math.min(100 - thumbPct, progress * (100 - thumbPct)));

  return (
    <section
      className={className}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      {/* Trim edges so first/last slide sit flush with container paddings */}
      <div className="-mx-3">
        <div
          ref={scrollerRef}
          tabIndex={0}
          aria-label={`${ariaLabel} scroller`}
          onKeyDown={onKeyDown}
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
          }}
          className={[
            "overflow-x-auto scroll-smooth",
            "touch-pan-x",
            // hide native scrollbar cross-browser
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-[#fcba17] rounded-[10px]",
            trackClassName,
          ].join(" ")}
        >
          <ul className="flex snap-x snap-mandatory snap-always min-w-0">
            {data.map((item, i) => (
              <li
                key={i}
                ref={(el) => (slidesRef.current[i] = el)}
                className={[
                  "shrink-0 snap-start min-w-0 px-3", // px-3 pairs with -mx-3 wrapper
                  itemBasisClass,
                ].join(" ")}
                style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
                aria-roledescription="slide"
                aria-label={`Slide ${i + 1} of ${count || skeletonCount}`}
              >
                {loading ? <Skeleton /> : renderItem?.(item, i)}
              </li>
            ))}
          </ul>
        </div>

        {/* Trackless, subtle progress bar */}
        {count > 1 && (
          <div className="relative mt-2 h-[6px] select-none">
            {/* no track background to keep it minimal */}
            <span
              className="absolute top-1/2 -translate-y-1/2 h-px rounded-full bg-black/25 dark:bg-white/30"
              style={{
                width: `${thumbPct}%`,
                left: `${leftPct}%`,
              }}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function DefaultSkeleton() {
  return (
    <div className="h-[280px] sm:h-[320px] md:h-[340px] rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
  );
}
