// app/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import Banner from "@/components/application/website/Banner";
import CategoryBanner from "@/components/application/website/CategoryBanner";
import Trusted from "@/components/application/website/Trusted";
import BestSellers from "@/components/application/website/BestSellers";
import ProductGrid from "@/components/application/website/ProductGrid";

import { useCategories } from "@/components/providers/CategoriesProvider";
import { useProducts, deriveKey } from "@/components/providers/ProductProvider";

export default function Home() {
  const { categories, isLoading: catLoading } = useCategories();
  const { setActiveKey, products, isLoading: prodLoading } = useProducts();

  const [banners, setBanners] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(true);

  const initialActive = useMemo(() => {
    if (!categories?.length) return null;
    return deriveKey(categories[0]);
  }, [categories]);

  // Banners (separate endpoint)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`/api/website/banners?active=true`);
        if (data?.success) {
          setBanners(
            [...data.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          );
        } else {
          setBanners([]);
        }
      } catch {
        setBanners([]);
      } finally {
        setBannerLoading(false);
      }
    })();
  }, []);

  // When user changes category tab
  const handleCategoryChange = (key) => {
    setActiveKey(key); // ProductProvider fetches for this key
  };

  return (
    <main>
      <Banner banners={banners} loading={bannerLoading} />

      {/* Categories from provider */}
      <CategoryBanner loading={catLoading} categories={categories} />

      <BestSellers
        categories={categories}
        initialActive={initialActive}
        onChange={handleCategoryChange}
      />

      <ProductGrid products={products} loading={prodLoading} />

      <Trusted />
    </main>
  );
}
