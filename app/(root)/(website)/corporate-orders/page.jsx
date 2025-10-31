import CorporateOrdersClient from "./CorporateOrdersClient";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const CORPORATE_PATH = "/corporate-orders";
const CORPORATE_URL = `${SITE_URL}${CORPORATE_PATH}`;

// ✅ Use your corporate meta image (recommended 1200x630)
const OG_IMAGE = `${SITE_URL}/meta-images/corporate.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Corporate Orders | ${BRAND}`,
  description: `Place bulk and corporate orders with ${BRAND_LONG}. Enjoy exclusive pricing, premium tech accessories, and reliable nationwide delivery for your organization.`,

  alternates: { canonical: CORPORATE_PATH },

  openGraph: {
    type: "website",
    url: CORPORATE_URL,
    siteName: BRAND_LONG,
    title: `Corporate Orders | ${BRAND}`,
    description: `Get exclusive deals on bulk purchases from ${BRAND_LONG}. Perfect for corporate gifting, employee perks, and events.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Corporate Orders`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Corporate Orders | ${BRAND}`,
    description: `Shop premium gadgets in bulk with ${BRAND_LONG}. Corporate gifting and bulk order solutions made easy.`,
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

  category: "ecommerce",
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
  return <CorporateOrdersClient />;
}
