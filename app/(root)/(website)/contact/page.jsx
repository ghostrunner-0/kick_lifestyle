import Script from "next/script";
import ContactSupportClient from "./ContactSupportClient";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const CONTACT_PATH = "/support/contact";
const CONTACT_URL = `${SITE_URL}${CONTACT_PATH}`;

// ✅ Use correct meta image (1200x630 recommended)
const OG_IMAGE = `${SITE_URL}/meta-images/contact.png`;

// ✅ Move viewport out of metadata (Next.js requirement)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Contact Support | ${BRAND}`,
  description: `Reach ${BRAND_LONG} support by email or phone, see service hours, or send us a message from this page.`,

  alternates: { canonical: CONTACT_PATH },

  openGraph: {
    type: "website",
    url: CONTACT_URL,
    siteName: BRAND_LONG,
    title: `Contact Support | ${BRAND}`,
    description: `Email, phone, and service hours for ${BRAND_LONG} — plus a quick contact form.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `Contact ${BRAND} Support`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Contact Support | ${BRAND}`,
    description: `Get help fast — contact ${BRAND_LONG} by email/phone or send a message.`,
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
  const ld = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Support",
    url: CONTACT_URL,
    isPartOf: { "@type": "WebSite", name: BRAND_LONG, url: SITE_URL },
    mainEntity: {
      "@type": "Organization",
      name: BRAND_LONG,
      alternateName: BRAND,
      url: SITE_URL,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "support@kick.com.np", // ✅ replace with your real support email
          telephone: "+977-9820810020", // ✅ replace with your real phone number
          areaServed: "NP",
          availableLanguage: ["en", "ne"],
        },
      ],
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
          opens: "10:00",
          closes: "18:00",
        },
      ],
    },
  };

  return (
    <>
      <Script
        id="ld-contact"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <ContactSupportClient />
    </>
  );
}
