import Script from "next/script";
import SupportHomeClient from "./SupportHomeClient";

const BRAND = "KICK";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: `Help Center | ${BRAND}`,
  description:
    `Get help with orders, delivery tracking, warranty & replacements, and how to contact ${BRAND_LONG}. Search FAQs or start a support request.`,
  keywords: [
    "KICK support",
    "Kick Lifestyle help center",
    "order tracking Nepal",
    "warranty Nepal",
    "earbuds support Nepal",
    "customer service Kick",
  ],
  alternates: { canonical: "/support" },
  openGraph: {
    title: `Help Center | ${BRAND}`,
    description:
      `Find your order, manage warranty, read FAQs, or contact ${BRAND_LONG}.`,
    url: "/support",
    type: "website",
    siteName: BRAND_LONG,
    images: [
      { url: "/og/support.jpg", width: 1200, height: 630, alt: "KICK Help Center" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Help Center | ${BRAND}`,
    description:
      `Orders & delivery, warranty & replacements, FAQs, and contact info — all in one place.`,
    images: ["/og/support.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  const ldCollection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Help Center",
    url: `${SITE_URL}/support`,
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
