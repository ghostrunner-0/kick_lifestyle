"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let posthogInitialized = false;

export function PostHogProvider({ children }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!POSTHOG_KEY) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "PostHog: NEXT_PUBLIC_POSTHOG_KEY is missing. Analytics disabled."
        );
      }
      // Still render children so app doesn't break
      setIsReady(true);
      return;
    }

    if (!posthogInitialized) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false, // handled manually
        capture_pageleave: true,
      });
      posthogInitialized = true;
    }

    setIsReady(true);
  }, []);

  if (!isReady) {
    // Avoid hydration glitches; you can return null or children directly.
    return null;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
