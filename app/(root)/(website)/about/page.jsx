// app/(root)/(website)/about/page.jsx
import Script from "next/script";
import AboutClient from "./AboutClient";

const BRAND = "KICK";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const ABOUT_PATH = "/about";
const ABOUT_URL = `${SITE_URL}${ABOUT_PATH}`;
const OG_IMAGE = "/og/about.jpg"; // 1200x630

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: `About ${BRAND_LONG} & Founder Kumod Begwani | ${BRAND}`,
  description: `${BRAND_LONG} is a proudly Nepali brand led by Kumod Begwani, crafting premium earbuds and wearables at honest prices. Learn about our mission, design philosophy, service, and milestones.`,
  keywords: [
    "Kick Lifestyle",
    "Kumod Begwani",
    "About Kick",
    "Nepali tech brand",
    "earbuds Nepal",
    "ANC earbuds",
    "smartwatch Nepal",
    "wearables Nepal",
    "audio brand Nepal",
    "premium earbuds Nepal",
  ],
  // Strong canonical and alternates
  alternates: { canonical: ABOUT_PATH },
  // Open Graph
  openGraph: {
    type: "website",
    url: ABOUT_PATH,
    siteName: BRAND_LONG,
    title: `About ${BRAND_LONG} & Founder Kumod Begwani | ${BRAND}`,
    description:
      "We build premium audio & wearables for Nepal — accessible, reliable, beautifully made.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — About`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: `About ${BRAND_LONG} & Founder Kumod Begwani | ${BRAND}`,
    description: "Mission, craft, service and milestones — built for Nepal.",
    images: [OG_IMAGE],
    // If you have handles, uncomment:
    // site: "@yourhandle",
    // creator: "@yourhandle",
  },
  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  // Useful extras
  category: "technology",
  applicationName: BRAND_LONG,
  creator: BRAND,
  publisher: BRAND_LONG,
  // Optional favicons (ensure files exist or update paths)
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Viewport (Next supports this in metadata)
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
  },
  // Optional: verification tokens (uncomment and set if you have them)
  // verification: {
  //   google: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  //   yandex: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  //   bing: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  //   facebook: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  // },
};

export default function Page() {
  const ldOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_LONG,
    alternateName: BRAND,
    url: SITE_URL,
    logo: `${SITE_URL}/assets/images/logo-black.png`,
    brand: { "@type": "Brand", name: BRAND_LONG },
    founder: {
      "@type": "Person",
      name: "Kumod Begwani",
      jobTitle: "Founder & CEO",
    },
    foundingDate: "2023-07-01",
    sameAs: [
      "https://www.facebook.com/kicklifestyle.shop/",
      "https://www.instagram.com/kicklifestyle.shop/",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: "+977-9820810020",
        email: "info@kick-lifestyle.shop",
        areaServed: "NP",
        availableLanguage: ["en", "ne"],
      },
    ],
  };

  const ldPerson = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Kumod Begwani",
    jobTitle: "Founder & CEO",
    worksFor: { "@type": "Organization", name: BRAND_LONG, url: SITE_URL },
    // sameAs: ["https://www.linkedin.com/in/...", "https://twitter.com/..."], // if available
  };

  const ldFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where is Kick Lifestyle based?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kathmandu, Nepal. We serve customers nationwide via our online store and partners.",
        },
      },
      {
        "@type": "Question",
        name: "What products do you build?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "True wireless earbuds, smartwatches, and accessories — feature-packed at honest prices.",
        },
      },
      {
        "@type": "Question",
        name: "How do I contact support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Email support or call during business hours (Sun–Fri, 10am–6pm).",
        },
      },
    ],
  };

  const ldBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "About", item: ABOUT_URL },
    ],
  };

  const ldWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `About ${BRAND_LONG} & Founder Kumod Begwani | ${BRAND}`,
    url: ABOUT_URL,
    isPartOf: { "@type": "WebSite", name: BRAND_LONG, url: SITE_URL },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${SITE_URL}${OG_IMAGE}`,
      width: 1200,
      height: 630,
    },
    description: `${BRAND_LONG} is a proudly Nepali brand led by Kumod Begwani, crafting premium earbuds and wearables at honest prices.`,
    breadcrumb: { "@id": `${ABOUT_URL}#breadcrumb` },
  };

  return (
    <>
      <Script
        id="ld-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldOrg) }}
      />
      <Script
        id="ld-person"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldPerson) }}
      />
      <Script
        id="ld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFAQ) }}
      />
      <Script
        id="ld-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...ldBreadcrumb,
            "@id": `${ABOUT_URL}#breadcrumb`,
          }),
        }}
      />
      <Script
        id="ld-webpage"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldWebPage) }}
      />
      <AboutClient />
    </>
  );
}
