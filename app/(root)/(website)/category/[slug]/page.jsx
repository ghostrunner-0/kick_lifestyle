// app/category/[slug]/page.jsx
"use client";

import React, { useEffect, useMemo } from "react";
import ProductGrid from "@/components/application/website/ProductGrid";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";

const toTitle = (s) =>
  (s || "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

export default function CategoryPage({ params }) {
  const slug = params?.slug;
  const { categories, isLoading: catLoading } = useCategories();
  const { setActiveKey, isLoading: prodLoading, products } = useProducts();

  // ensure ProductProvider fetches this category
  useEffect(() => {
    if (slug) setActiveKey(slug);
  }, [slug, setActiveKey]);

  // title from category name or slug
  const title = useMemo(() => {
    const match = categories?.find((c) => deriveKey(c) === slug);
    return match?.name || toTitle(slug);
  }, [categories, slug]);

  return (
    <main>
      <section className="px-5 pt-6">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <div className="text-sm text-slate-500">
            {!prodLoading && Array.isArray(products)
              ? `${products.length} product${products.length === 1 ? "" : "s"}`
              : "Loading…"}
          </div>
        </div>
      </section>

      {/* ProductGrid reads from ProductProvider (no props needed) */}
      <ProductGrid loading={prodLoading || catLoading} />
    </main>
  );
}
