// app/(site)/page.jsx
import HomeClient from "./HomeClient";
import Script from "next/script";
export const dynamic = "force-dynamic"; // ✅ ensure runtime fetch in prod (no build-time SSG)
export const revalidate = 0;
const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np"
).replace(/\/$/, "");

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: ` ${BRAND} | Best Earbuds in Nepal`,
  description: `${BRAND_LONG} by Kumod Begwani brings premium true wireless earbuds, smartwatches, and tech accessories to Nepal — cutting-edge features, great prices, and trusted quality. #ProudlyNepali`,
  alternates: { canonical: "/" },
  openGraph: {
    title: ` ${BRAND} | Best Earbuds in Nepal`,
    description: `${BRAND_LONG} is redefining tech accessories in Nepal with premium TWS earbuds (ZenBuds, Buds S Pro) and smart watches at honest prices.`,
    url: "/",
    type: "website",
    siteName: BRAND_LONG,
    images: [
      {
        url: "/og/home.jpg",
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} – Best Earbuds in Nepal`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Best Earbuds in Nepal | ${BRAND}`,
    description: `Shop premium TWS earbuds and smartwatches from ${BRAND_LONG}. “Tune into Zen.” #ProudlyNepali`,
    images: ["/og/home.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: "technology",
};

export default async function Page() {
  // --- Server fetch banners ---
  let initialBanners = [];
  try {
    const url = SITE_URL
      ? `${SITE_URL}/api/website/banners?active=true`
      : `/api/website/banners?active=true`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const json = await res.json();
    if (json?.success && Array.isArray(json.data)) {
      initialBanners = [...json.data].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
    }
  } catch (err) {
    console.log(err.message);
  }

  // --- Server fetch categories ---
  let initialCategories = [];
  try {
    const url = SITE_URL
      ? `${SITE_URL}/api/website/category`
      : `/api/website/category`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const json = await res.json();
    if (json?.success && Array.isArray(json.data)) {
      // Show only the website-visible categories, keep original order
      initialCategories = json.data.filter((c) => c?.showOnWebsite);
    }
  } catch {}

  const ldWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_LONG,
    url: SITE_URL,
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const ldOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_LONG,
    alternateName: BRAND,
    url: SITE_URL,
    slogan: "Tune into Zen",
    founder: { "@type": "Person", name: "Kumod Begwani", jobTitle: "Founder" },
  };

  return (
    <>
      <Script
        id="ld-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldWebsite) }}
      />
      <Script
        id="ld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldOrg) }}
      />
      <HomeClient
        initialBanners={initialBanners}
        initialCategories={initialCategories}
      />
    </>
  );
}
