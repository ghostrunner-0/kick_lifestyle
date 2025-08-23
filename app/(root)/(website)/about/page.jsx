// app/(root)/(website)/about/page.jsx
import Script from "next/script";
import AboutClient from "./AboutClient";

const BRAND = "KICK";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: `About ${BRAND_LONG} & Founder Kumod Begwani | ${BRAND}`,
  description:
    `${BRAND_LONG} by Kumod Begwani is a proudly Nepali brand crafting premium earbuds and wearables at honest prices. Explore our vision, craft, team and milestones.`,
  keywords: [
    "Kick Lifestyle","Kumod Begwani","about Kick","Nepali tech brand",
    "earbuds Nepal","ANC earbuds","smartwatch Nepal","wearables Nepal"
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${BRAND_LONG} | ${BRAND}`,
    description: `We build premium audio & wearables for Nepal — accessible, reliable, beautifully made.`,
    url: "/about",
    type: "website",
    siteName: BRAND_LONG,
    images: [{ url: "/og/about.jpg", width: 1200, height: 630, alt: `${BRAND_LONG} — About` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `About ${BRAND_LONG} | ${BRAND}`,
    description: `Mission, craft, team and founder — Kumod Begwani. Built for Nepal.`,
    images: ["/og/about.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  category: "technology",
};

export default function Page() {
  const ldOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_LONG,
    alternateName: BRAND,
    url: SITE_URL,
    logo: `${SITE_URL}/assets/images/logo-black.png`,
    brand: { "@type": "Brand", name: BRAND_LONG },
    founder: { "@type": "Person", name: "Kumod Begwani", jobTitle: "Founder & CEO" },
    foundingDate: "2023-07-01",
    sameAs: [
      "https://www.facebook.com/kicklifestyle.shop/",
      "https://www.instagram.com/kicklifestyle.shop/"
    ],
    contactPoint: [{
      "@type":"ContactPoint", contactType:"customer support",
      telephone:"+977-9820810020", email:"info@kick-lifestyle.shop",
      areaServed:"NP", availableLanguage:["en","ne"]
    }]
  };

  const ldPerson = {
    "@context":"https://schema.org","@type":"Person",
    name:"Kumod Begwani", jobTitle:"Founder & CEO",
    worksFor:{ "@type":"Organization", name:BRAND_LONG, url:SITE_URL }
  };

  const ldFAQ = {
    "@context":"https://schema.org","@type":"FAQPage",
    mainEntity:[
      { "@type":"Question", name:"Where is Kick Lifestyle based?",
        acceptedAnswer:{ "@type":"Answer", text:"Kathmandu, Nepal. We serve customers nationwide via our online store and partners." } },
      { "@type":"Question", name:"What products do you build?",
        acceptedAnswer:{ "@type":"Answer", text:"True wireless earbuds, smartwatches, and accessories — feature-packed at honest prices." } },
      { "@type":"Question", name:"How do I contact support?",
        acceptedAnswer:{ "@type":"Answer", text:"Email support or call during business hours (Sun–Fri, 10am–6pm)." } }
    ]
  };

  return (
    <>
      <Script id="ld-org" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldOrg) }} />
      <Script id="ld-person" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldPerson) }} />
      <Script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFAQ) }} />
      <AboutClient />
    </>
  );
}
