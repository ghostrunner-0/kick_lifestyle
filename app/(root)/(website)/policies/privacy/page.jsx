import Privacy from "./privacy";

export const metadata = {
  title: "Privacy Policy | Kick Lifestyle",
  description:
    "Learn how Kick Lifestyle collects, uses, and protects your personal data. We value your privacy and ensure complete transparency across our platform.",
  keywords: [
    "Kick Lifestyle",
    "Privacy Policy",
    "Data Protection",
    "User Information",
    "E-commerce Nepal",
    "Customer Rights",
  ],
  openGraph: {
    title: "Privacy Policy | Kick Lifestyle",
    description:
      "Understand how Kick Lifestyle ensures secure handling of your personal information and privacy rights.",
    url: "https://kick.com.np/privacy",
    siteName: "Kick Lifestyle",
    type: "website",
    locale: "en_NP",
    images: [
      {
        url: "https://kick.com.np/og/privacy.jpg",
        width: 1200,
        height: 630,
        alt: "Kick Lifestyle Privacy Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Kick Lifestyle",
    description:
      "Understand how Kick Lifestyle safeguards your data and ensures a transparent shopping experience.",
    images: ["https://kick.com.np/og/privacy.jpg"],
  },
  alternates: {
    canonical: "https://kick.com.np/privacy",
  },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="max-w-4xl mx-auto px-5 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-gray-900">
          Privacy Policy
        </h1>
        <Privacy />
      </div>
    </main>
  );
}
