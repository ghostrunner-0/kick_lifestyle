// app/(site)/page.jsx
import HomeClient from "./HomeClient";
import Script from "next/script";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np"
).replace(/\/$/, "");
const HOME_PATH = "/";
const HOME_URL = `${SITE_URL}${HOME_PATH}`;

// ✅ Default meta image (brand logo)
const OG_IMAGE = `${SITE_URL}/meta-images/logo.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${BRAND} | Premium Earbuds & Smartwatches in Nepal`,
  description: `${BRAND_LONG} by Kumod Begwani brings premium true wireless earbuds, smartwatches, and tech accessories to Nepal — cutting-edge features, great prices, and trusted quality. #ProudlyNepali`,
  alternates: { canonical: HOME_PATH },

  openGraph: {
    type: "website",
    url: HOME_URL,
    siteName: BRAND_LONG,
    title: `${BRAND} | Premium Earbuds & Smartwatches in Nepal`,
    description: `${BRAND_LONG} is redefining tech accessories in Nepal with premium TWS earbuds and smartwatches at honest prices.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Home`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `${BRAND} | Premium Earbuds & Smartwatches in Nepal`,
    description: `Shop premium TWS earbuds and smartwatches from ${BRAND_LONG}. “Tune into Zen.” #ProudlyNepali`,
    images: [OG_IMAGE],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  category: "technology",
  applicationName: BRAND_LONG,
  creator: BRAND,
  publisher: BRAND_LONG,

  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
  },
};

export default async function Page() {
  // --- Server fetch: banners ---
  let initialBanners = [];
  try {
    const url = `${SITE_URL}/api/website/banners?active=true`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        initialBanners = [...json.data].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
      }
    }
  } catch (err) {
    console.warn("[banners] fetch failed:", err?.message || err);
  }

  // --- Server fetch: categories ---
  let initialCategories = [];
  try {
    const url = `${SITE_URL}/api/website/category`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        initialCategories = json.data.filter((c) => c?.showOnWebsite);
      }
    }
  } catch (err) {
    console.warn("[categories] fetch failed:", err?.message || err);
  }

  // --- JSON-LD ---
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
    sameAs: [
      "https://www.facebook.com/kicklifestyle.shop/",
      "https://www.instagram.com/kicklifestyle.shop/",
    ],
    logo: `${SITE_URL}/meta-images/logo.png`,
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
