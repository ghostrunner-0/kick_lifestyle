import KhaltiReturnClient from "./KhaltiReturnClient";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const KHALTI_PATH = "/khalti-return";
const KHALTI_URL = `${SITE_URL}${KHALTI_PATH}`;

// ✅ Default meta image (brand logo)
const OG_IMAGE = `${SITE_URL}/meta-images/logo.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Khalti Payment | ${BRAND}`,
  description: `Returning from Khalti. We’re verifying your payment and will redirect you to your order confirmation if successful.`,

  alternates: { canonical: KHALTI_PATH },

  openGraph: {
    type: "website",
    url: KHALTI_URL,
    siteName: BRAND_LONG,
    title: `Khalti Payment | ${BRAND}`,
    description: `We’re verifying your Khalti payment. You’ll be redirected to your order confirmation once confirmed.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Khalti Payment Verification`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Khalti Payment | ${BRAND}`,
    description: `Verifying your Khalti payment and finalizing your order at ${BRAND_LONG}.`,
    images: [OG_IMAGE],
  },

  robots: {
    index: false, // ❌ prevent indexing since it’s a temporary redirect page
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-snippet": -1,
      "max-image-preview": "none",
      "max-video-preview": -1,
    },
  },

  category: "payment",
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
  return <KhaltiReturnClient />;
}
