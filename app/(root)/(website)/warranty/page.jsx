import WarrantyHubClient from "./WarrantyHubClient";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const PAGE_PATH = "/warranty";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const OG_IMAGE = `${SITE_URL}/meta-images/warranty.png`; // ✅ specific image

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Warranty Center | ${BRAND}`,
  description: `Register your ${BRAND_LONG} product warranty or check remaining coverage by phone number. Fast, simple, and secure.`,

  alternates: { canonical: PAGE_PATH },

  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: BRAND_LONG,
    title: `Warranty Center | ${BRAND}`,
    description: `Register or check ${BRAND_LONG} warranties online — quick registration and coverage lookup.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Warranty Center`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Warranty Center | ${BRAND}`,
    description: `Register your ${BRAND_LONG} warranty or check coverage instantly online.`,
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
  return <WarrantyHubClient />;
}
