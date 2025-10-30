"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { CATEGORY_VIEW_ROUTE } from "@/routes/WebsiteRoutes";

/* deterministic per-category accent (for the tiny dot) */
const ACCENTS = [
  "bg-[#fcba17]",
  "bg-sky-400",
  "bg-emerald-400",
  "bg-indigo-400",
  "bg-rose-400",
  "bg-amber-400",
];
const pickAccent = (key) => {
  const s = String(key || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ACCENTS[Math.abs(h) % ACCENTS.length];
};

/* ----------------------------- Skeletons ----------------------------- */
const SkeletonCard = ({ large = false, artLeft = false }) => {
  const pads = large
    ? artLeft
      ? "pl-[160px] sm:pl-[220px] pr-6 py-6 sm:py-8 min-h-[240px] sm:min-h-[280px]"
      : "pr-[160px] sm:pr-[220px] pl-6 py-6 sm:py-8 min-h-[240px] sm:min-h-[280px]"
    : artLeft
    ? "pl-[140px] sm:pl-[190px] pr-6 py-5 sm:py-6 min-h-[200px]"
    : "pr-[140px] sm:pr-[190px] pl-6 py-5 sm:py-6 min-h-[200px]";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* Kick ribbon */}
      <div className="absolute left-0 top-0 h-2 w-16 bg-[#fcba17] rounded-tr" />
      {/* content */}
      <div className={["flex items-center", pads].join(" ")}>
        <div className="space-y-3">
          <div className="h-7 w-56 rounded bg-neutral-200 animate-pulse" />
          <div className="h-4 w-28 rounded bg-neutral-200 animate-pulse" />
        </div>
      </div>
      {/* spotlight */}
      <div
        className={[
          "absolute -top-8 size-[180px] sm:size-[220px] rounded-full bg-neutral-100 border border-neutral-200",
          artLeft ? "left-3 sm:left-5" : "right-3 sm:right-5",
        ].join(" ")}
      />
    </div>
  );
};

/* ----------------------------- Tile Card ----------------------------- */
function CategoryTile({ cat, idx, large = false, artLeft = false }) {
  const key = cat._id || cat.slug || cat.name || idx;
  const href = CATEGORY_VIEW_ROUTE(cat.slug || "");
  const src = cat?.image?.path || cat?.banner?.path || "";
  const alt = cat?.image?.alt || cat?.banner?.alt || cat?.name || "Category";
  const dot = pickAccent(key);

  const pads = large
    ? artLeft
      ? "pl-[170px] sm:pl-[230px] pr-6 py-6 sm:py-8"
      : "pr-[170px] sm:pr-[230px] pl-6 py-6 sm:py-8"
    : artLeft
    ? "pl-[145px] sm:pl-[195px] pr-6 py-5 sm:py-6"
    : "pr-[145px] sm:pr-[195px] pl-6 py-5 sm:py-6";

  const artWrapClasses = [
    "pointer-events-none absolute z-20",
    artLeft ? "left-0 sm:left-1" : "right-0 sm:right-1",
    large
      ? "top-2 sm:-top-1 w-[200px] sm:w-[250px] md:w-[290px]"
      : "top-2 sm:-top-2 w-[170px] sm:w-[210px]",
  ].join(" ");

  return (
    <Link
      href={href}
      prefetch
      aria-label={cat?.name || "Category"}
      className="group block focus:outline-none"
    >
      <article className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-neutral-900/10">
        {/* Kick ribbon (thin, tasteful) */}
        <div className="absolute left-0 top-0 h-2 w-16 bg-[#fcba17] rounded-tr" />

        {/* tiny accent dot */}
        <span
          className={[
            "absolute top-3 right-4 inline-block h-2 w-2 rounded-full",
            dot,
          ].join(" ")}
          aria-hidden="true"
        />

        {/* spotlight behind product */}
        <div
          className={[
            "pointer-events-none absolute -top-8 size-[180px] sm:size-[220px] rounded-full bg-neutral-100 border border-neutral-200",
            artLeft ? "left-3 sm:left-5" : "right-3 sm:right-5",
          ].join(" ")}
          aria-hidden="true"
        />

        {/* diagonal corner chip (white-on-white depth) */}
        <div
          className="absolute right-0 bottom-0 h-10 w-10 bg-neutral-50 border-l border-t border-neutral-200 rounded-tl-xl"
          aria-hidden="true"
        />

        {/* content */}
        <div className={["relative z-10", pads].join(" ")}>
          <h3
            className={[
              "font-extrabold tracking-tight text-neutral-900",
              large
                ? "text-[22px] sm:text-[28px] md:text-[32px]"
                : "text-[18px] sm:text-[22px]",
            ].join(" ")}
          >
            {cat.name}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] uppercase tracking-wider text-neutral-600">
              Explore
            </span>
            <span className="inline-flex items-center rounded-full bg-[#fcba17] text-black font-semibold px-2.5 py-0.5 text-[12px]">
              Shop now
              <svg
                className="ml-1 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 5l8 7-8 7" />
              </svg>
            </span>
          </div>
        </div>

        {/* artwork */}
        <div className={artWrapClasses}>
          <div className="relative w-full aspect-square">
            {src ? (
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:scale-[1.03]"
                sizes={
                  large
                    ? "(min-width:1280px) 18rem, (min-width:1024px) 16rem, (min-width:640px) 14rem, 12rem"
                    : "(min-width:1280px) 14rem, (min-width:1024px) 12rem, (min-width:640px) 11rem, 10rem"
                }
                priority={idx < 2}
              />
            ) : (
              <div className="grid h-full w-full place-items-center rounded-full bg-neutral-100 border border-neutral-200">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  className="text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 16l5-5 4 4 5-6 4 5" />
                  <path d="M3 7h18v12H3z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ------------------------------- Main ------------------------------- */
export default function CategoryBanner() {
  const { categories, isLoading } = useCategories();

  const list = useMemo(() => {
    const arr = Array.isArray(categories) ? categories : [];
    return arr.filter((c) => c?.showOnWebsite);
  }, [categories]);

  const count = list.length;

  /* Loading */
  if (isLoading) {
    if (count <= 1) {
      return (
        <section className="w-full py-6">
          <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
            <SkeletonCard large />
          </div>
        </section>
      );
    }
    return (
      <section className="w-full py-6">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <SkeletonCard />
            <SkeletonCard artLeft />
          </div>
        </div>
      </section>
    );
  }

  /* Empty */
  if (!count) {
    return (
      <section className="w-full py-10">
        <div className="mx-auto max-w-screen-md px-5 text-center">
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-10">
            <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-900">
              Categories coming soon
            </h3>
            <p className="mt-1.5 text-sm sm:text-base text-neutral-500">
              We’re curating the best picks for you.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* 1 category → hero */
  if (count === 1) {
    return (
      <section className="w-full py-6">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <CategoryTile cat={list[0]} idx={0} large />
        </div>
      </section>
    );
  }

  /* 2 categories → split (alternating art side) */
  if (count === 2) {
    const [c0, c1] = list;
    return (
      <section className="w-full py-6">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <CategoryTile cat={c0} idx={0} />
            <CategoryTile cat={c1} idx={1} artLeft />
          </div>
        </div>
      </section>
    );
  }

  /* 3+ fallback */
  return (
    <section className="w-full py-6">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {list.map((cat, idx) => (
            <CategoryTile
              key={cat._id || cat.slug || idx}
              cat={cat}
              idx={idx}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
