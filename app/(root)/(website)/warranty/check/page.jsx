import WarrantyCheckClient from "./WarrantyCheckClient";

// ✅ Force dynamic to prevent static build hang
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const PAGE_PATH = "/warranty/check";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const OG_IMAGE = `${SITE_URL}/meta-images/warranty.png`;

// ✅ Moved viewport outside metadata
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: `Warranty Lookup | ${BRAND}`,
  description: `Check your ${BRAND_LONG} product warranty by phone number. Optionally filter with Order ID or the last 4 digits of your serial number.`,
  alternates: { canonical: PAGE_PATH },

  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: BRAND_LONG,
    title: `Warranty Lookup | ${BRAND}`,
    description: `Look up ${BRAND_LONG} warranty coverage, validity period, and remaining days using your registered phone number.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Warranty Lookup`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Warranty Lookup | ${BRAND}`,
    description: `Quickly check your ${BRAND_LONG} product warranty using your phone number or order details.`,
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
  return <WarrantyCheckClient />;
}
