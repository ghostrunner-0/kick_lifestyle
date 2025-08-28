"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

import Banner from "@/components/application/website/Banner";
import CategoryBanner from "@/components/application/website/CategoryBanner";

// Defer JS for below-the-fold sections
const Trusted = dynamic(() => import("@/components/application/website/Trusted"), { ssr: true });
const BestSellers = dynamic(() => import("@/components/application/website/BestSellers"), { ssr: true });
const ProductGrid = dynamic(() => import("@/components/application/website/ProductGrid"), { ssr: true });

import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";

export default function HomeClient({ initialBanners = [], initialCategories = [] }) {
  // Context values (still fetch in background to keep cache warm)
  const { categories: ctxCategories, isLoading: ctxCatLoading } = useCategories();
  const { setActiveKey, products, isLoading: prodLoading } = useProducts();

  // Prefer SSR categories if present, otherwise fall back to context
  const categories = initialCategories.length ? initialCategories : (ctxCategories || []);
  const catLoading = initialCategories.length ? false : ctxCatLoading;

  // Pick first category key from whichever list we’re using
  const initialActive = useMemo(() => {
    if (!categories?.length) return null;
    return deriveKey(categories[0]);
  }, [categories]);

  // Kick off product fetching immediately using SSR category (if available)
  useEffect(() => {
    if (initialActive) {
      setActiveKey(initialActive);
    }
  }, [initialActive, setActiveKey]);

  const handleCategoryChange = (key) => setActiveKey(key);

  return (
    <main>
      {/* LCP: Hero banner has data immediately */}
      <Banner banners={initialBanners} loading={false} />

      {/* Category strip (no spinner if we had SSR data) */}
      <section className="content-visibility-auto contain-intrinsic-size-[600px]">
        <CategoryBanner loading={catLoading} categories={categories} />
      </section>

      {/* Best sellers tab bar */}
      <section className="content-visibility-auto contain-intrinsic-size-[800px]">
        <BestSellers
          categories={categories}
          initialActive={initialActive}
          onChange={handleCategoryChange}
        />
      </section>

      {/* Products grid from ProductProvider */}
      <section className="content-visibility-auto contain-intrinsic-size-[1200px]">
        <ProductGrid products={products} loading={prodLoading} />
      </section>

      <section className="content-visibility-auto contain-intrinsic-size-[400px]">
        <Trusted />
      </section>
    </main>
  );
}
