// app/(root)/(website)/layout.jsx

import React from "react";
import Script from "next/script";

import Footer from "@/components/application/website/Footer";
import Header from "@/components/application/website/Header";
import BottomNav from "@/components/application/website/BottomNav";

import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { CategoriesProvider } from "@/components/providers/CategoriesProvider";
import {
  ProductProvider,
  deriveKey,
} from "@/components/providers/ProductProvider";
import AuthHydrator from "@/components/providers/AuthHydrator";
import PopupProvider from "@/components/providers/PopupProvider";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { PostHogProvider } from "@/app/providers/posthog";
import PostHogPageView from "@/components/PostHogPageView";
import GoogleAnalyticsPageView from "@/components/GoogleAnalyticsPageView";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "";

export default async function Layout({ children }) {
  let initialCategories = [];
  let initialActiveKey = null;
  let initialProducts = [];

  // Fetch categories
  try {
    if (SITE_URL) {
      const res = await fetch(`${SITE_URL}/api/website/category`, {
        next: { revalidate: 300 },
      });
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        initialCategories = json.data.filter((c) => c?.showOnWebsite);
      }
    }
  } catch (e) {
    console.error("Error loading categories:", e?.message);
  }

  // Fetch initial products for first category
  try {
    if (SITE_URL && initialCategories.length) {
      initialActiveKey = deriveKey(initialCategories[0]);
      const prodRes = await fetch(
        `${SITE_URL}/api/website/products?category=${encodeURIComponent(
          initialActiveKey
        )}`,
        { next: { revalidate: 120 } }
      );
      const prodJson = await prodRes.json();
      if (Array.isArray(prodJson?.data)) {
        initialProducts = prodJson.data;
      }
    }
  } catch (e) {
    console.error("Error loading products:", e?.message);
  }

  return (
    <>
      {/* ---------- Google Analytics (GA4) ---------- */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { send_page_view: false });
            `}
          </Script>
        </>
      )}

      {/* ---------- Facebook Pixel ---------- */}
      {FB_PIXEL_ID && (
        <>
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');

              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
              console.log('FB Pixel initialized with ID: ${FB_PIXEL_ID}');
            `}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
              alt="fb-pixel"
            />
          </noscript>
        </>
      )}

      {/* ---------- App Providers & Layout ---------- */}
      <PostHogProvider>
        <ReactQueryProvider>
          <AuthHydrator />
          <Analytics />

          <CategoriesProvider initialCategories={initialCategories}>
            <ProductProvider
              initialActiveKey={initialActiveKey}
              initialProducts={initialProducts}
            >
              <Header />

              <main className="pb-16 md:pb-0">
                <PostHogPageView />
                {GA_ID && <GoogleAnalyticsPageView />}
                {children}
              </main>

              <PopupProvider />
              <SpeedInsights />
              <Footer />
              <BottomNav />
            </ProductProvider>
          </CategoriesProvider>
        </ReactQueryProvider>
      </PostHogProvider>
    </>
  );
}
