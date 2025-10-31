import CheckoutClient from "./CheckoutClient";

const BRAND = "KICK LIFESTYLE";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const CHECKOUT_PATH = "/checkout";
const CHECKOUT_URL = `${SITE_URL}${CHECKOUT_PATH}`;

// ✅ Use default brand logo for meta image
const OG_IMAGE = `${SITE_URL}/meta-images/logo.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Checkout | ${BRAND}`,
  description: `Securely complete your purchase at ${BRAND}. Review your cart, enter delivery details, and place your order with confidence.`,

  alternates: { canonical: CHECKOUT_PATH },

  openGraph: {
    type: "website",
    url: CHECKOUT_URL,
    siteName: BRAND,
    title: `Checkout | ${BRAND}`,
    description: `Finish your shopping journey at ${BRAND}. Fast, secure, and easy checkout experience.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND} — Checkout`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Checkout | ${BRAND}`,
    description: `Complete your order at ${BRAND} with our secure and hassle-free checkout process.`,
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
  applicationName: BRAND,
  creator: BRAND,
  publisher: BRAND,
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
  },
};

export default function Page() {
  return <CheckoutClient />;
}
