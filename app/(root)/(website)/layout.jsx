// app/(website)/layout.jsx
import Footer from "@/components/application/website/Footer";
import Header from "@/components/application/website/Header";
import React from "react";

import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { CategoriesProvider } from "@/components/providers/CategoriesProvider";
import { ProductProvider } from "@/components/providers/ProductProvider";
import BottomNav from "@/components/application/website/BottomNav";
import { deriveKey } from "@/components/providers/ProductProvider";
import AuthHydrator from "@/components/providers/AuthHydrator";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
// If you truly need a different font *just for this subtree*,
// import it and apply on a wrapper <div>. Do NOT render <html>/<body> here.
// import { Poppins } from "next/font/google";
// const poppins = Poppins({ subsets: ["latin"], display: "swap", weight: ["400","500","600","700"] });

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

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
        `${SITE_URL}/api/website/products?category=${encodeURIComponent(
          initialActiveKey
        )}`,
        { next: { revalidate: 120 } }
      );
      const prodJson = await prodRes.json();
      if (Array.isArray(prodJson?.data)) initialProducts = prodJson.data;
    }
  } catch {}

  return (
    // If you want the local font, wrap like:
    // <div className={poppins.className}>
    <>
      <ReactQueryProvider>
        <AuthHydrator />
        <Analytics />

        <CategoriesProvider initialCategories={initialCategories}>
          <ProductProvider
            initialActiveKey={initialActiveKey}
            initialProducts={initialProducts}
          >
            <Header />
            <main className="pb-16 md:pb-0">{children}</main>
            <SpeedInsights />
            <Footer />
            <BottomNav />
          </ProductProvider>
        </CategoriesProvider>
      </ReactQueryProvider>
    </>
    // </div>
  );
}
