import OfflineRegistrationClient from "./OfflineRegisterClient";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const PAGE_PATH = "/offline-registeration";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const OG_IMAGE = `${SITE_URL}/meta-images/warranty.png`; // ✅ Use warranty.png

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Offline Warranty Registration | ${BRAND}`,
  description: `Register your ${BRAND_LONG} product warranty for purchases made from Kick Lifestyle, Daraz, or other retail partners. Upload proof and activate your coverage instantly.`,

  alternates: { canonical: PAGE_PATH },

  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: BRAND_LONG,
    title: `Offline Warranty Registration | ${BRAND}`,
    description: `Register your ${BRAND_LONG} product warranty for purchases from Kick Lifestyle, Daraz, or local stores. Upload proof and activate warranty coverage.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Offline Warranty Registration`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Offline Warranty Registration | ${BRAND}`,
    description: `Easily register your ${BRAND_LONG} product warranty with invoice or proof of purchase. Works for all offline and partner purchases.`,
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
  return <OfflineRegistrationClient />;
}
