import Terms from "./terms";

export const metadata = {
  title: "Terms & Conditions | Kick Lifestyle",
  description:
    "Review Kick Lifestyle’s Terms & Conditions including warranty coverage, delivery policy, and customer obligations.",
  keywords: [
    "Kick Lifestyle",
    "Terms and Conditions",
    "Warranty Policy",
    "Failed Delivery Policy",
    "E-commerce Nepal",
    "Kick Warranty",
  ],
  openGraph: {
    title: "Terms & Conditions | Kick Lifestyle",
    description:
      "Read the complete Terms & Conditions for Kick Lifestyle — warranty, delivery, returns, and customer support.",
    url: "https://kick.com.np/terms",
    siteName: "Kick Lifestyle",
    type: "website",
    locale: "en_NP",
    images: [
      {
        url: "https://kick.com.np/og/terms.jpg",
        width: 1200,
        height: 630,
        alt: "Kick Lifestyle Terms & Conditions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms & Conditions | Kick Lifestyle",
    description:
      "Kick Lifestyle’s official warranty, delivery, and liability policy details.",
    images: ["https://kick.com.np/og/terms.jpg"],
  },
  alternates: {
    canonical: "https://kick.com.np/terms",
  },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="max-w-4xl mx-auto px-5 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-gray-900">
          Terms & Conditions
        </h1>
        <Terms />
      </div>
    </main>
  );
}
