// app/(website)/layout.jsx (or your layout file shown)
import Footer from "@/components/application/website/Footer";
import Header from "@/components/application/website/Header";
import React from "react";
import { Poppins } from "next/font/google";

import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { CategoriesProvider } from "@/components/providers/CategoriesProvider";
import { ProductProvider } from "@/components/providers/ProductProvider";
import BottomNav from "@/components/application/website/BottomNav";
import { deriveKey } from "@/components/providers/ProductProvider";
import AuthHydrator from "@/components/providers/AuthHydrator"; // <-- add this

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "";

export default async function Layout({ children }) {
  let initialCategories = [];
  let initialActiveKey = null;
  let initialProducts = [];

  try {
    const res = await fetch(`${SITE_URL}/api/website/category`, {
      next: { revalidate: 300 },
    });
    const json = await res.json();
    if (json?.success && Array.isArray(json.data)) {
      initialCategories = json.data.filter((c) => c?.showOnWebsite);
    }
  } catch {}

  try {
    if (initialCategories.length) {
      initialActiveKey = deriveKey(initialCategories[0]);
      const prodRes = await fetch(
        `${SITE_URL}/api/website/products?category=${encodeURIComponent(initialActiveKey)}`,
        { next: { revalidate: 120 } }
      );
      const prodJson = await prodRes.json();
      if (Array.isArray(prodJson?.data)) initialProducts = prodJson.data;
    }
  } catch {}

  return (
    <html lang="en">
      <body className={poppins.className}>
        <ReactQueryProvider>
          {/* <-- Hydrate Redux from NextAuth session if needed */}
          <AuthHydrator />

          <CategoriesProvider initialCategories={initialCategories}>
            <ProductProvider
              initialActiveKey={initialActiveKey}
              initialProducts={initialProducts}
            >
              <Header />
              <main className="pb-16 md:pb-0">{children}</main>
              <Footer />
              <BottomNav />
            </ProductProvider>
          </CategoriesProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
