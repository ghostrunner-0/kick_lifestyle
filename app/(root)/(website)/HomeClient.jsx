"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import Banner from "@/components/application/website/Banner";
import CategoryBanner from "@/components/application/website/CategoryBanner";
import { useProducts } from "@/components/providers/ProductProvider";

import { MotionConfig, motion, useReducedMotion } from "framer-motion";

/* --- Dynamic chunks (suspense for better LCP) --- */
const Trusted = dynamic(
  () => import("@/components/application/website/Trusted"),
  {
    ssr: true,
    suspense: true,
  }
);
const BestSellers = dynamic(
  () => import("@/components/application/website/BestSellers"),
  {
    ssr: true,
    suspense: true,
  }
);
const ProductGrid = dynamic(
  () => import("@/components/application/website/ProductGrid"),
  {
    ssr: true,
    suspense: true,
  }
);
const KickLifestyleMarquee = dynamic(
  () => import("@/components/application/website/KickLifestyleMarquee"),
  { ssr: true, suspense: true }
);
const BlogCarousel = dynamic(
  () => import("@/components/application/website/BlogCarousel"),
  {
    ssr: true,
    suspense: true,
  }
);
const HomePageBannerDisplay = dynamic(
  () => import("@/components/application/website/HomePageBannerDisplay"),
  { ssr: true, suspense: true }
);
const KickStarsArmy = dynamic(
  () => import("@/components/application/website/KickStars"),
  {
    ssr: true,
    suspense: true,
  }
);
const KickPartnersMarquee = dynamic(
  () => import("@/components/application/website/KickPartnersMarquee"),
  { ssr: true, suspense: true }
);
const KickReviewsCoverage = dynamic(
  () => import("@/components/application/website/KickReviewsCoverage"),
  { ssr: true, suspense: true }
);

/* --- tiny in-view loader to keep UI snappy --- */
function InlineSkeleton({ className = "h-[280px]" }) {
  return (
    <div className={`w-full rounded-2xl bg-neutral-100/60 ${className}`} />
  );
}

/* --- Canonical key for unique count (unchanged) --- */
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

/* --- Reusable motion section with tasteful defaults --- */
const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: "easeOut" },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.55, ease: "easeOut" },
    },
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.55, ease: "easeOut" },
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  },
};

function MotionSection({
  children,
  variant = "fadeUp",
  className = "",
  once = true,
  amount = 0.22,
}) {
  return (
    <motion.section
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants[variant] || variants.fadeUp}
    >
      {children}
    </motion.section>
  );
}

export default function HomeClient({ initialBanners = [] }) {
  const { products, isLoading: prodLoading } = useProducts();
  const prefersReduced = useReducedMotion();

  // unique count to decide grid visibility
  const uniqueCount = useMemo(() => {
    const s = new Set();
    for (const p of products || []) {
      const k = canonicalKey(p);
      if (k) s.add(k);
    }
    return s.size;
  }, [products]);

  return (
    <MotionConfig reducedMotion={prefersReduced ? "always" : "user"}>
      <main>
        {/* Above the fold: keep instant, no animation */}
        <Banner banners={initialBanners} loading={false} />

        {/* Category banner (premium gradient tiles) */}
        <section className="content-visibility-auto contain-intrinsic-size-[420px] md:contain-intrinsic-size-[460px]">
          <CategoryBanner />
        </section>

        {/* BestSellers – distinct animation */}
        <MotionSection
          variant="fadeUp"
          className="content-visibility-auto contain-intrinsic-size-[460px] md:contain-intrinsic-size-[520px] xl:contain-intrinsic-size-[560px]"
        >
          <Suspense fallback={<InlineSkeleton className="h-[360px]" />}>
            <BestSellers />
          </Suspense>
        </MotionSection>

        {/* Mid-banner – a gentle scale-in (keeps it classy) */}
        <MotionSection variant="scaleIn" className="content-visibility-auto">
          <Suspense fallback={<InlineSkeleton className="h-[260px]" />}>
            <HomePageBannerDisplay />
          </Suspense>
        </MotionSection>

        {/* Big product grid only if meaningful count; slide in slightly from the right */}
        {uniqueCount >= 8 && (
          <MotionSection
            variant="slideLeft"
            className="content-visibility-auto contain-intrinsic-size-[1200px]"
            amount={0.18}
          >
            <Suspense fallback={<InlineSkeleton className="h-[900px]" />}>
              <ProductGrid products={products} loading={prodLoading} />
            </Suspense>
          </MotionSection>
        )}

        {/* Light marquee – just a fadeIn to avoid motion fatigue */}
        <MotionSection
          variant="fadeIn"
          className="content-visibility-auto py-7"
        >
          <Suspense fallback={<InlineSkeleton className="h-[120px]" />}>
            <KickLifestyleMarquee />
          </Suspense>
        </MotionSection>

        {/* Social proof – subtle fadeUp */}
        <MotionSection
          variant="fadeUp"
          className="content-visibility-auto contain-intrinsic-size-[400px]"
        >
          <Suspense fallback={<InlineSkeleton className="h-[280px]" />}>
            <Trusted />
          </Suspense>
        </MotionSection>

        {/* KickStars – center stage, fadeIn for softer entrance */}
        <MotionSection variant="fadeIn" className="w-full flex justify-center">
          <Suspense fallback={<InlineSkeleton className="h-[320px]" />}>
            <KickStarsArmy />
          </Suspense>
        </MotionSection>

        {/* Reviews – slideRight to vary rhythm */}
        <MotionSection variant="slideRight" className="content-visibility-auto">
          <Suspense fallback={<InlineSkeleton className="h-[420px]" />}>
            <KickReviewsCoverage />
          </Suspense>
        </MotionSection>

        {/* Blog – fadeUp (consistent with above sections) */}
        <MotionSection variant="fadeUp" className="content-visibility-auto">
          <Suspense fallback={<InlineSkeleton className="h-[360px]" />}>
            <BlogCarousel />
          </Suspense>
        </MotionSection>

        {/* Partners – fadeIn with low motion */}
        <MotionSection variant="fadeIn" className="content-visibility-auto">
          <Suspense fallback={<InlineSkeleton className="h-[120px]" />}>
            <KickPartnersMarquee
              partners={[
                { name: "HUKUT", src: "/assets/images/hukut.png" },
                { name: "DARAZ", src: "/assets/images/daraz.png" },
                { name: "KHALTI", src: "/assets/images/khalti.png" },
                { name: "BROTHER MART", src: "/assets/images/Brothermart.png" },
              ]}
              height="h-16"
              speedSec={20}
            />
          </Suspense>
        </MotionSection>
      </main>
    </MotionConfig>
  );
}
