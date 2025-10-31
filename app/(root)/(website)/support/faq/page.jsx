// app/(root)/(website)/support/faq/page.jsx
// Server component wrapper (no "use client")
import FAQSupport from "./faq";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const FAQ_PATH = "/support/faq";
const FAQ_URL = `${SITE_URL}${FAQ_PATH}`;

// ✅ Default meta image (brand logo)
const OG_IMAGE = `${SITE_URL}/meta-images/logo.png`; // 1200x630 recommended canvas

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Help & FAQ | ${BRAND}`,
  description: `Find answers to common questions about orders, delivery, and warranty at ${BRAND_LONG}. Learn how to track your order, request warranty service, and more.`,
  keywords: [
    BRAND_LONG,
    "FAQ",
    "Support",
    "Warranty",
    "Delivery",
    "Orders",
    "Help Center",
    "Customer Service",
  ],

  alternates: { canonical: FAQ_PATH },

  openGraph: {
    type: "website",
    url: FAQ_URL,
    siteName: BRAND_LONG,
    title: `Help & FAQ | ${BRAND}`,
    description: `Quick answers to your questions about ${BRAND_LONG} products, orders, and support.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} Help & FAQ`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Help & FAQ | ${BRAND}`,
    description: `Get help with your ${BRAND_LONG} orders, delivery, and warranty issues.`,
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
};

export default function Page() {
  return (
    <div className="relative">
      {/* subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[120px]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <FAQSupport />
      </div>
    </div>
  );
}
