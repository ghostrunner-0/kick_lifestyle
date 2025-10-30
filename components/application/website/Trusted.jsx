"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

/* ------------------------------------------------------------------ */
/* Sample data (replace or pass via props)                            */
/* ------------------------------------------------------------------ */
const SAMPLE = [
  {
    name: "Rikesh N",
    title: "KICK NEKXA BUDS Z10",
    body:
      "Mero second Kick Nekxa ko Z10 buds. First 1800 ma kiney, yo 1400 ma — dami cha! Gaming mode sabai try gareko earbuds maddhe best.",
    rating: 5,
  },
  {
    name: "Anisha T",
    title: "NEKXA Z50 Pro",
    body:
      "Battery life is insane and the bass is clean, not muddy. Mic quality is way better than my last pair. Totally worth it.",
    rating: 4.5,
  },
  {
    name: "Sujal K",
    title: "NEKXA Pods Air",
    body:
      "Super comfy fit. Crystal-clear calls on Zoom and the transparency mode feels natural. Would recommend.",
    rating: 5,
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const initials = (n = "") =>
  n
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Stars = ({ value = 5, size = 14 }) => {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${value} star rating`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={filled ? "fill-current" : "fill-transparent stroke-current"}
            strokeWidth="1.6"
          >
            <path d="M12 17.3 6.89 20.3l1.37-5.87L3 9.74l5.96-.51L12 3.8l3.04 5.43 5.96.51-5.26 4.69 1.37 5.87L12 17.3z" />
          </svg>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Compact card                                                       */
/* ------------------------------------------------------------------ */
function TestimonialCard({ t }) {
  return (
    <article
      className="
        group rounded-xl border border-neutral-200/70 dark:border-neutral-800
        bg-white/90 dark:bg-neutral-950/60 backdrop-blur
        p-4 sm:p-5 transition-colors
        hover:border-[#fcba17]/40
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 grid place-items-center text-sm font-semibold">
            {initials(t.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{t.name}</p>
            <Stars value={t.rating ?? 5} />
          </div>
        </div>
        {/* subtle quote mark */}
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-neutral-300 dark:text-neutral-600 shrink-0" fill="currentColor">
          <path d="M7.17 6A4.17 4.17 0 0 0 3 10.17V21h6.25v-9.17H6.5A2.5 2.5 0 1 1 9 9.33V6H7.17Zm9 0A4.17 4.17 0 0 0 12 10.17V21h6.25v-9.17h-2.75A2.5 2.5 0 1 1 18.5 9.33V6h-2.33Z" />
        </svg>
      </div>

      <h3 className="mt-3 text-base sm:text-[17px] font-semibold leading-snug text-neutral-900 dark:text-white">
        {t.title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600 dark:text-neutral-300">
        {t.body}
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Main: minimal professional layout + Embla carousel                 */
/* ------------------------------------------------------------------ */
export default function Trusted({
  testimonials = SAMPLE,
  statLabel = "Most Trusted Brand of",
  statCountry = "Nepal",
  statValue = "100K+",
}) {
  const items = useMemo(
    () => (Array.isArray(testimonials) ? testimonials : [testimonials]).filter(Boolean),
    [testimonials]
  );

  const autoplay = useRef(
    Autoplay({ delay: 3600, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: items.length > 1,
      align: "start",
      skipSnaps: false,
      containScroll: "trimSnaps",
      dragFree: false,
    },
    [autoplay.current]
  );

  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setSnaps(emblaApi.scrollSnapList());
      onSelect();
    });
  }, [emblaApi, onSelect]);

  const prev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const to = useCallback((i) => emblaApi && emblaApi.scrollTo(i), [emblaApi]);

  return (
    <section className="w-full">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 2xl:px-16 py-12 sm:py-16">
        <div
          className="
            grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10
            rounded-3xl border border-neutral-200/70 dark:border-neutral-800
            bg-white/70 dark:bg-neutral-950/50 backdrop-blur
            p-6 sm:p-8
          "
        >
          {/* Left — stat + header */}
          <div className="lg:col-span-5 flex items-center justify-center text-center lg:text-left">
            <div className="max-w-xl">
              <p className="text-sm md:text-[15px] font-medium text-neutral-700 dark:text-neutral-300">
                {statLabel} <span className="text-[#fcba17] font-semibold">{statCountry}</span>
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                <span className="text-[#fcba17]">{statValue}</span> satisfied customers
              </h2>
              <div className="mt-4 h-[3px] w-20 rounded bg-[#fcba17]" />
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
                Real feedback from real users — performance, comfort, and design that deliver.
              </p>

              {/* controls (show only if multiple) */}
              {items.length > 1 && (
                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Previous"
                    className="h-9 w-9 rounded-full border border-neutral-200 dark:border-neutral-800 grid place-items-center hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                      <path d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a.997.997 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next"
                    className="h-9 w-9 rounded-full border border-neutral-200 dark:border-neutral-800 grid place-items-center hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                      <path d="M7.293 4.293a1 1 0 011.414 0L13.707 9.293a.997.997 0 010 1.414L8.707 15.707a1 1 0 11-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right — Embla carousel */}
          <div className="lg:col-span-7 relative">
            {/* edge fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/80 dark:from-neutral-950/80 to-transparent z-10 rounded-l-2xl" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/80 dark:from-neutral-950/80 to-transparent z-10 rounded-r-2xl" />

            <div ref={emblaRef} className="overflow-hidden">
              <div className="flex gap-4">
                {items.map((t, i) => (
                  <div
                    key={i}
                    className="
                      flex-[0_0_90%]
                      sm:flex-[0_0_55%]
                      lg:flex-[0_0_48%]
                    "
                  >
                    <TestimonialCard t={t} />
                  </div>
                ))}
              </div>
            </div>

            {/* dots */}
            {snaps.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {snaps.map((_, i) => {
                  const active = i === selected;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => to(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={[
                        "h-2.5 rounded-full transition-all",
                        active
                          ? "w-5 bg-[#fcba17]"
                          : "w-2.5 bg-neutral-300 dark:bg-neutral-700",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
