"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { CATEGORY_VIEW_ROUTE } from "@/routes/WebsiteRoutes";

/* ---------- Single Tile ---------- */
function GradientCategoryTile({ cat, idx }) {
  const href = CATEGORY_VIEW_ROUTE(cat.slug || "");
  const src = cat?.image?.path || cat?.banner?.path || "";
  const alt = cat?.image?.alt || cat?.banner?.alt || cat?.name || "Category";

  return (
    <Link
      href={href}
      prefetch
      className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-neutral-200 p-6 sm:p-8
                 bg-gradient-to-br from-white via-[#fefefe] to-[#f5f5f5]
                 hover:from-[#fffef7] hover:to-[#fef9e4] transition-all duration-300 ease-out"
    >
      {/* Text */}
      <div className="z-10 pr-28 md:pr-36">
        <h3 className="text-[20px] sm:text-[24px] font-semibold tracking-tight text-neutral-900">
          {cat.name}
        </h3>
        <p className="mt-1 text-sm text-neutral-600">
          Explore {cat.name?.toLowerCase()} collection
        </p>
        <div className="mt-4 inline-flex items-center text-sm font-medium text-neutral-900 group-hover:text-[#fcba17] transition-colors">
          Shop Now
          <svg
            className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 5l8 7-8 7" />
          </svg>
        </div>
      </div>

      {/* Image */}
      {src && (
        <div className="absolute right-0 bottom-0 h-full w-1/2 pointer-events-none">
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(min-width:1024px) 22rem, (min-width:640px) 16rem, 12rem"
              className="object-contain object-right transition-transform duration-300 group-hover:scale-105"
              priority={idx < 2}
            />
          </div>
        </div>
      )}

      {/* Hover Glow */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#fcba1715] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
    </Link>
  );
}

/* ---------- Skeleton Loader ---------- */
function TileSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-100 to-neutral-200 h-48 animate-pulse" />
  );
}

/* ---------- Main ---------- */
export default function CategoryBanner() {
  const { categories, isLoading } = useCategories();

  const list = useMemo(() => {
    const arr = Array.isArray(categories) ? categories : [];
    return arr.filter((c) => c?.showOnWebsite);
  }, [categories]);

  const count = list.length;

  // Loading
  if (isLoading) {
    const placeholders = Math.max(2, count || 2);
    return (
      <section className="w-full py-10">
        <div className="mx-auto max-w-screen-2xl px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: placeholders }).map((_, i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  // Empty
  if (!count) {
    return (
      <section className="w-full py-10 text-center text-sm text-neutral-500">
        No categories found.
      </section>
    );
  }

  // Render dynamically (all images on right)
  return (
    <section className="w-full py-10">
      <div
        className={`mx-auto max-w-screen-2xl px-4 grid gap-6 ${
          count === 1
            ? "grid-cols-1"
            : count === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {list.map((cat, idx) => (
          <GradientCategoryTile
            key={cat._id || cat.slug || idx}
            cat={cat}
            idx={idx}
          />
        ))}
      </div>
    </section>
  );
}
