"use client";

import dynamic from "next/dynamic";
import Banner from "@/components/application/website/Banner";
import CategoryBanner from "@/components/application/website/CategoryBanner";
import { useProducts } from "@/components/providers/ProductProvider";
import { useMemo } from "react";

const Trusted = dynamic(() => import("@/components/application/website/Trusted"), { ssr: true });
const BestSellers = dynamic(() => import("@/components/application/website/BestSellers"), { ssr: true });
const ProductGrid = dynamic(() => import("@/components/application/website/ProductGrid"), { ssr: true });

/* same canonical key for quick counting */
const canonicalKey = (p) => {
  if (!p) return null;
  const slug = p.slug || p.handle || p?.data?.slug || p.productSlug || p?.seo?.slug;
  if (slug) return `slug:${String(slug).toLowerCase()}`;
  const parent = p.parentId || p.productId || p.pid || p.masterId || p.groupId;
  if (parent) return `pid:${parent}`;
  const name = (p.name || p.title || "").trim().toLowerCase();
  const basePrice = p.specialPrice ?? p.price ?? p.mrp ?? p?.data?.price ?? "";
  return `name:${name}|price:${basePrice}`;
};

export default function HomeClient({ initialBanners = [] }) {
  const { products, isLoading: prodLoading } = useProducts();

  // count unique to decide whether to render the big grid
  const uniqueCount = useMemo(() => {
    const s = new Set();
    for (const p of products || []) {
      const k = canonicalKey(p);
      if (k) s.add(k);
    }
    return s.size;
  }, [products]);

  return (
    <main>
      <Banner banners={initialBanners} loading={false} />

      <section className="content-visibility-auto contain-intrinsic-size-[600px]">
        <CategoryBanner />
      </section>

      <section className="content-visibility-auto contain-intrinsic-size-[800px]">
        <BestSellers />
      </section>

      {/* show the big grid only if we really have enough unique items */}
      {uniqueCount >= 8 && (
        <section className="content-visibility-auto contain-intrinsic-size-[1200px]">
          <ProductGrid products={products} loading={prodLoading} />
        </section>
      )}

      <section className="content-visibility-auto contain-intrinsic-size-[400px]">
        <Trusted />
      </section>
    </main>
  );
}
