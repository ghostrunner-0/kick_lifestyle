// components/GoogleAnalyticsPageView.jsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export default function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    if (typeof window === "undefined") return;
    if (typeof window.gtag !== "function") return;

    const search = searchParams?.toString();
    const url =
      window.location.origin + pathname + (search ? `?${search}` : "");

    window.gtag("config", GA_ID, {
      page_path: pathname,
      page_location: url,
    });
  }, [pathname, searchParams]);

  return null;
}
