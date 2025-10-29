"use client";

import dynamic from "next/dynamic";
import Banner from "@/components/application/website/Banner";
import CategoryBanner from "@/components/application/website/CategoryBanner";
import { useProducts } from "@/components/providers/ProductProvider";
import { useMemo } from "react";
import KickLifestyleMarquee from "@/components/application/website/KickLifestyleMarquee";
import BlogCarousel from "@/components/application/website/BlogCarousel";
import HomePageBannerDisplay from "@/components/application/website/HomePageBannerDisplay";

import { motion, useReducedMotion } from "framer-motion";
import KickStarsArmy from "@/components/application/website/KickStars";
import KickPartnersMarquee from "@/components/application/website/KickPartnersMarquee";
import KickReviewsCoverage from "@/components/application/website/KickReviewsCoverage";

const Trusted = dynamic(
  () => import("@/components/application/website/Trusted"),
  { ssr: true }
);
const BestSellers = dynamic(
  () => import("@/components/application/website/BestSellers"),
  { ssr: true }
);
const ProductGrid = dynamic(
  () => import("@/components/application/website/ProductGrid"),
  { ssr: true }
);

/* same canonical key for quick counting */
const canonicalKey = (p) => {
  if (!p) return null;
  const slug =
    p.slug || p.handle || p?.data?.slug || p.productSlug || p?.seo?.slug;
  if (slug) return `slug:${String(slug).toLowerCase()}`;
  const parent = p.parentId || p.productId || p.pid || p.masterId || p.groupId;
  if (parent) return `pid:${parent}`;
  const name = (p.name || p.title || "").trim().toLowerCase();
  const basePrice = p.specialPrice ?? p.price ?? p.mrp ?? p?.data?.price ?? "";
  return `name:${name}|price:${basePrice}`;
};

export default function HomeClient({ initialBanners = [] }) {
  const { products, isLoading: prodLoading } = useProducts();
  const prefersReduced = useReducedMotion();

  // scroll entrance animation (fade + slight rise)
  const reveal = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  // apply only to sections that should animate on scroll
  const scrollAnimProps = prefersReduced
    ? {}
    : {
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, amount: 0.22 },
      };

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
      {/* ✅ Top banners: NO animation */}
      <Banner banners={initialBanners} loading={false} />

      <section className="content-visibility-auto contain-intrinsic-size-[420px] md:contain-intrinsic-size-[460px]">
        <CategoryBanner />
      </section>

      {/* ✅ From here down: animate on scroll */}
      <motion.section
        className="content-visibility-auto contain-intrinsic-size-[460px] md:contain-intrinsic-size-[520px] xl:contain-intrinsic-size-[560px]"
        variants={reveal}
        {...scrollAnimProps}
      >
        <BestSellers />
      </motion.section>

      <motion.section
        className="content-visibility-auto"
        variants={reveal}
        {...scrollAnimProps}
      >
        <HomePageBannerDisplay />
      </motion.section>

      {uniqueCount >= 8 && (
        <motion.section
          className="content-visibility-auto contain-intrinsic-size-[1200px]"
          variants={reveal}
          {...scrollAnimProps}
        >
          <ProductGrid products={products} loading={prodLoading} />
        </motion.section>
      )}

      <motion.section
        className="content-visibility-auto py-7"
        variants={reveal}
        {...scrollAnimProps}
      >
        <KickLifestyleMarquee />
      </motion.section>

      <motion.section
        className="content-visibility-auto contain-intrinsic-size-[400px]"
        variants={reveal}
        {...scrollAnimProps}
      >
        <Trusted />
      </motion.section>
      <motion.section
        className="flex justify-center items-center w-full min-h-screen"
        variants={reveal}
        {...scrollAnimProps}
      >
        <div className="w-full max-w-full flex justify-center">
          <KickStarsArmy />
        </div>
      </motion.section>

      <motion.section
        className="content-visibility-auto"
        variants={reveal}
        {...scrollAnimProps}
      >
        <KickReviewsCoverage />
      </motion.section>
      <motion.section
        className="content-visibility-auto"
        variants={reveal}
        {...scrollAnimProps}
      >
        <BlogCarousel />
      </motion.section>
      <motion.section
        className="content-visibility-auto"
        variants={reveal}
        {...scrollAnimProps}
      >
        <KickPartnersMarquee
          partners={[
            { name: "HUKUT", src: "/assets/partners/hukut.svg" },
            { name: "DARAZ", src: "/assets/partners/daraz.svg" },
            { name: "KHALTI", src: "/assets/partners/khalti.svg" },
            { name: "IMEPAY", src: "/assets/partners/imepay.svg" },
            { name: "BROTHER MART", src: "/assets/partners/brothermart.svg" },
          ]}
          height="h-16"
          speedSec={20}
        />
      </motion.section>
    </main>
  );
}
