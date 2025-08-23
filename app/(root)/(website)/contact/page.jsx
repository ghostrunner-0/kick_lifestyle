import Script from "next/script";
import ContactSupportClient from "./ContactSupportClient";

const BRAND = "KICK";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: `Contact Support | ${BRAND}`,
  description: `Reach ${BRAND_LONG} support by email or phone, see service hours, or send us a message from this page.`,
  alternates: { canonical: "/support/contact" },
  openGraph: {
    title: `Contact Support | ${BRAND}`,
    description: `Email, phone, and service hours for ${BRAND_LONG} — plus a quick contact form.`,
    url: "/support/contact",
    type: "website",
    siteName: BRAND_LONG,
    images: [{ url: "/og/support-contact.jpg", width: 1200, height: 630, alt: "Contact KICK Support" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact Support | ${BRAND}`,
    description: `Get help fast — contact ${BRAND_LONG} by email/phone or send a message.`,
    images: ["/og/support-contact.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Support",
    url: `${SITE_URL}/support/contact`,
    isPartOf: { "@type": "WebSite", name: BRAND_LONG, url: SITE_URL },
    mainEntity: {
      "@type": "Organization",
      name: BRAND_LONG,
      alternateName: BRAND,
      url: SITE_URL,
      contactPoint: [{
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@example.com",         // ← replace with real email
        telephone: "+977 98XXXXXXXX",         // ← replace with real phone
        areaServed: "NP",
        availableLanguage: ["en", "ne"]
      }],
      openingHoursSpecification: [{
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"],
        opens: "10:00",
        closes: "18:00"
      }]
    }
  };

  return (
    <>
      <Script id="ld-contact" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <ContactSupportClient />
    </>
  );
}
