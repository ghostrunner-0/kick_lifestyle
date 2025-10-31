import ThankYouClient from "./ThankYouClient";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const THANKYOU_PATH = "/thank-you";
const THANKYOU_URL = `${SITE_URL}${THANKYOU_PATH}`;

// ✅ Use default brand logo as meta image
const OG_IMAGE = `${SITE_URL}/meta-images/logo.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Order Placed | ${BRAND}`,
  description: `Thank you for your order at ${BRAND_LONG}. We’ve received it and sent a confirmation to your email.`,

  alternates: { canonical: THANKYOU_PATH },

  openGraph: {
    type: "website",
    url: THANKYOU_URL,
    siteName: BRAND_LONG,
    title: `Order Placed | ${BRAND}`,
    description: `Your ${BRAND_LONG} order has been placed successfully. Keep your Order ID handy for support.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Order Placed`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Order Placed | ${BRAND}`,
    description: `Thanks for shopping with ${BRAND_LONG}. A confirmation email is on its way.`,
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

export default async function Page({ params }) {
  const param = await params;
  return <ThankYouClient params={param} />;
}
