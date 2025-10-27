// Server component wrapper (no "use client")
import FAQSupport from "./faq";

export const metadata = {
  title: "Help & FAQ | Kick Lifestyle",
  description:
    "Find answers to common questions about orders, delivery, and warranty at Kick Lifestyle. Learn how to track your order, request warranty service, and more.",
  keywords: [
    "Kick Lifestyle",
    "FAQ",
    "Support",
    "Warranty",
    "Delivery",
    "Orders",
    "Help Center",
    "Customer Service",
  ],
  openGraph: {
    title: "Help & FAQ | Kick Lifestyle",
    description:
      "Quick answers to your questions about Kick Lifestyle products, orders, and support.",
    url: "https://kick.com.np/support/faq",
    siteName: "Kick Lifestyle",
    locale: "en_NP",
    type: "website",
    images: [
      {
        url: "https://kick.com.np/og/faq-cover.jpg", // replace if you have a real OG image
        width: 1200,
        height: 630,
        alt: "Kick Lifestyle Help & FAQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Help & FAQ | Kick Lifestyle",
    description:
      "Get help with your Kick Lifestyle orders, delivery, and warranty issues.",
    images: ["https://kick.com.np/og/faq-cover.jpg"], // replace with real path
  },
  alternates: {
    canonical: "https://kick.com.np/support/faq",
  },
};

export default function Page() {
  return (
    <div className="relative">
      {/* subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[120px]  " />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <FAQSupport />
      </div>
    </div>
  );
}
