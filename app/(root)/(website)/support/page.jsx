import Script from "next/script";
import SupportHomeClient from "./SupportHomeClient";

// ✅ Force dynamic render (avoid long static build)
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const SUPPORT_PATH = "/support";
const SUPPORT_URL = `${SITE_URL}${SUPPORT_PATH}`;

// ✅ Updated meta image (1200x630 recommended)
const OG_IMAGE = `${SITE_URL}/meta-images/support.png`;

// ✅ Moved viewport outside metadata
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Help Center | ${BRAND}`,
  description: `Get help with orders, delivery tracking, warranty & replacements, and how to contact ${BRAND_LONG}. Search FAQs or start a support request.`,

  keywords: [
    "Kick Lifestyle support",
    "Kick Lifestyle help center",
    "order tracking Nepal",
    "warranty Nepal",
    "earbuds support Nepal",
    "customer service Kick Lifestyle",
  ],

  alternates: { canonical: SUPPORT_PATH },

  openGraph: {
    type: "website",
    url: SUPPORT_URL,
    siteName: BRAND_LONG,
    title: `Help Center | ${BRAND}`,
    description: `Find your order, manage warranty, read FAQs, or contact ${BRAND_LONG}.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Help Center`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Help Center | ${BRAND}`,
    description: `Orders & delivery, warranty & replacements, FAQs, and contact info — all in one place.`,
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

  category: "support",
  applicationName: BRAND_LONG,
  creator: BRAND,
  publisher: BRAND_LONG,
};

export default function Page() {
  const ldCollection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Help Center",
    url: SUPPORT_URL,
    isPartOf: { "@type": "WebSite", name: BRAND_LONG, url: SITE_URL },
    hasPart: [
      {
        "@type": "WebPage",
        url: `${SITE_URL}/support/orders`,
        name: "Orders & Delivery Tracking",
        description: "Track orders, delivery timelines, and shipping FAQs.",
      },
      {
        "@type": "WebPage",
        url: `${SITE_URL}/support/warranty`,
        name: "Warranty, Repair & Replacement",
        description: "Coverage details and how to start a claim.",
      },
      {
        "@type": "WebPage",
        url: `${SITE_URL}/support/contact`,
        name: "Contact & Additional Info",
        description: "Talk to a human—email, phone, hours, and policies.",
      },
      {
        "@type": "WebPage",
        url: `${SITE_URL}/support/faq`,
        name: "FAQ",
        description: "Quick answers to the most common questions.",
      },
    ],
  };

  return (
    <>
      <Script
        id="ld-support-collection"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCollection) }}
      />
      <SupportHomeClient />
    </>
  );
}
