import HomeClient from "./HomeClient";
import Script from "next/script";

const BRAND = "KICK";                         // short brand for titles
const BRAND_LONG = "Kick Lifestyle";          // full brand for copy
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: `Best Earbuds in Nepal | ${BRAND}`,
  description:
    `${BRAND_LONG} by Kumod Begwani brings premium true wireless earbuds, smartwatches, and tech accessories to Nepal — cutting-edge features, great prices, and trusted quality. #ProudlyNepali`,
  keywords: [
    "best earbuds in Nepal",
    "true wireless earbuds Nepal",
    "TWS Nepal",
    "noise cancellation earbuds Nepal",
    "smart watch Nepal",
    "tech accessories Nepal",
    "Kick Lifestyle",
    "Kumod Begwani",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: `Best Earbuds in Nepal | ${BRAND}`,
    description:
      `${BRAND_LONG} is redefining tech accessories in Nepal with premium TWS earbuds (ZenBuds, Buds S Pro) and smart watches at honest prices.`,
    url: "/",
    type: "website",
    siteName: BRAND_LONG,
    images: [
      {
        url: "/og/home.jpg",      // change if you have a better OG image
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} – Best Earbuds in Nepal`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Best Earbuds in Nepal | ${BRAND}`,
    description:
      `Shop premium TWS earbuds and smartwatches from ${BRAND_LONG}. “Tune into Zen.” #ProudlyNepali`,
    images: ["/og/home.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: "technology",
};

export default function Page() {
  // JSON-LD: WebSite + Organization (uses your provided info)
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
    // Add your real logo URL if available:
    // logo: `${SITE_URL}/logo.svg`,
    slogan: "Tune into Zen",
    founder: {
      "@type": "Person",
      name: "Kumod Begwani",
      jobTitle: "Founder",
    },
    // Add social profiles if/when you have them:
    // sameAs: ["https://www.facebook.com/...", "https://www.instagram.com/..."]
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
      <HomeClient />
    </>
  );
}
