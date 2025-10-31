import WarrantyClient from "./WarrantyClient";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const PAGE_PATH = "/support/warranty";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

// ✅ Default meta image
const OG_IMAGE = `${SITE_URL}/meta-images/warranty.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Warranty, Repair & Replacement | ${BRAND}`,
  description: `Learn about ${BRAND_LONG}'s warranty coverage, repair process, and how to start a replacement claim.`,

  alternates: { canonical: PAGE_PATH },

  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: BRAND_LONG,
    title: `Warranty, Repair & Replacement | ${BRAND}`,
    description: `Understand what’s covered under ${BRAND_LONG} warranty and how to request a repair or replacement.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Warranty Support`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Warranty, Repair & Replacement | ${BRAND}`,
    description: `What’s covered under warranty, and how to start a repair or replacement claim at ${BRAND_LONG}.`,
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
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
  },
};

export default function Page() {
  return (
    <div className="relative">
      {/* subtle background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[120px]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <WarrantyClient />
      </div>
    </div>
  );
}
