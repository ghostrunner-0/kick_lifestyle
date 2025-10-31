import StudentDiscountClient from "./StudentDiscountClient";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const STUDENT_PATH = "/student-discount";
const STUDENT_URL = `${SITE_URL}${STUDENT_PATH}`;

// ✅ Meta image for Student Discount page
const OG_IMAGE = `${SITE_URL}/meta-images/stddis.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: `Student Discount | ${BRAND}`,
  description: `Apply for the ${BRAND_LONG} Student Discount. Verify your student status with your college ID to receive exclusive offers.`,

  alternates: { canonical: STUDENT_PATH },

  openGraph: {
    type: "website",
    url: STUDENT_URL,
    siteName: BRAND_LONG,
    title: `Student Discount | ${BRAND}`,
    description: `Apply for the ${BRAND_LONG} Student Discount and unlock exclusive savings with your college ID.`,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_LONG} — Student Discount`,
      },
    ],
    locale: "en_NP",
    alternateLocale: ["ne_NP", "en_US"],
  },

  twitter: {
    card: "summary_large_image",
    title: `Student Discount | ${BRAND}`,
    description: `Exclusive offers for students! Verify your college ID to claim the ${BRAND_LONG} Student Discount.`,
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

  keywords: [
    "student discount",
    "college discount",
    "Kick Lifestyle student",
    "education pricing",
    "Kick student offer",
    "Nepal student deals",
  ],

  category: "promotion",
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
  return <StudentDiscountClient />;
}
