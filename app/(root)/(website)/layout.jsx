// app/(site)/layout.jsx  (server component)
import Footer from "@/components/application/website/Footer";
import Header from "@/components/application/website/Header";
import React from "react";
import { Poppins } from "next/font/google";

import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { CategoriesProvider } from "@/components/providers/CategoriesProvider";
import { ProductProvider } from "@/components/providers/ProductProvider";
import BottomNav from "@/components/application/website/BottomNav";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Prefer explicit base URL for production/dev, otherwise fallback to relative paths
const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

export default async function Layout({ children }) {
  // ✅ server-fetch once so Header + pages render instantly
  let initialCategories = [];
  try {
    const res = await fetch(`${SITE_URL}/api/website/category`, {
      next: { revalidate: 300 },
    });
    const json = await res.json();
    if (json?.success && Array.isArray(json.data)) {
      initialCategories = json.data.filter((c) => c?.showOnWebsite);
    }
  } catch {}

  return (
    <html lang="en">
      <body className={poppins.className}>
        <ReactQueryProvider>
          {/* ⬇️ pass the server data here */}
          <CategoriesProvider initialCategories={initialCategories}>
            <ProductProvider>
              <Header />
              <main>{children}</main>
              <Footer />
              <BottomNav />
            </ProductProvider>
          </CategoriesProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
