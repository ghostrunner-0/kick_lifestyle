"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { use, useEffect } from "react";
import { usePostHog } from "posthog-js/react";
export default function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url += "?" + searchParams.toString();
      }
      posthog.capture("pageview", { url });
    }
  }, [pathname, searchParams, posthog]);
  return null;
}
