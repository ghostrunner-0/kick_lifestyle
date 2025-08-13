"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";

/** Light bg colors (no gradients) */
const BG_COLORS = [
  "bg-slate-100",
  "bg-sky-100",
  "bg-emerald-100",
  "bg-amber-100",
  "bg-indigo-100",
  "bg-zinc-100",
];

/** Stable pick so each category keeps the same bg color */
const pickBg = (key) => {
  const s = String(key || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return BG_COLORS[Math.abs(h) % BG_COLORS.length];
};

export default function CategoryBanner() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/website/category", {
          cache: "no-store",
        });
        setCategories(Array.isArray(data?.data) ? data.data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="py-10 text-center text-sm text-neutral-500">Loading…</div>
    );
  if (!categories.length)
    return (
      <div className="py-10 text-center text-sm text-neutral-500">
        No categories found
      </div>
    );

  return (
    <section className="w-full py-5">
      <div className="mx-auto max-w-screen-2xl px-5 sm:px-5 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-10">
          {categories.map((cat) => {
            const href = `/category/${cat.slug || ""}`;
            const src = cat?.image?.path || "";
            const alt = cat?.image?.alt || cat?.name || "Category";
            const bg = pickBg(cat._id || cat.slug || cat.name);

            return (
              <Link
                key={cat._id || cat.slug || cat.name}
                href={href}
                className={`relative isolate flex items-center rounded-2xl ${bg} overflow-visible group
                            transition
                            pl-5 pr-28 md:pl-6 md:pr-36 py-6 md:py-8`}
              >
                {/* TEXT */}
                <div className="z-10 w-[80%] md:w-[80%]">
                  <h3 className="capitalize text-2xl md:text-3xl font-semibold tracking-tight text-black mix-blend-difference">
                    {cat.name}
                  </h3>
                  <span className="mt-2 inline-flex items-center text-sm text-black mix-blend-difference">
                    Shop now
                    <svg
                      className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
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

                {/* FLOATING IMAGE — slightly above the card, never clipped */}
                {src && (
                  <div
                    className="absolute right-3 md:right-6 top-0
                               -translate-y-3 sm:-translate-y-4 md:-translate-y-17
                               z-20 w-36 sm:w-40 md:w-48 lg:w-56
                               drop-shadow-2xl transition-transform group-hover:scale-105 pointer-events-none"
                  >
                    <div className="relative w-full aspect-square">
                      <Image
                        src={src}
                        alt={alt}
                        fill
                        className="object-contain"
                        sizes="(min-width:1280px) 14rem, (min-width:768px) 12rem, 9rem"
                        priority={false}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
