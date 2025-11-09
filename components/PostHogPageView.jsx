"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

export default function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog || !pathname) return;
    if (typeof window === "undefined") return;

    const search = searchParams?.toString();
    const url =
      window.location.origin + pathname + (search ? `?${search}` : "");

    // Standard PostHog pageview event
    posthog.capture("$pageview", {
      $current_url: url,
      $pathname: pathname,
      $source: "next-app-router",
    });
  }, [posthog, pathname, searchParams]);

  return null;
}
