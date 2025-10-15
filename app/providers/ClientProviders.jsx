"use client";

import React, { Suspense, useEffect, useState } from "react";
import SessionProviderWrapper from "../providers/SessionProviderWrapper";
import GlobalProvider from "@/components/application/GlobalProvider";
import { Toaster } from "react-hot-toast";

// Only mount devtools on the client & in development
function Devtools() {
  if (process.env.NODE_ENV !== "development") return null;
  const [RQDevtools, setRQDevtools] = useState(null);
  useEffect(() => {
    // Dynamic import to avoid any SSR touch
    import("@tanstack/react-query-devtools").then((m) =>
      setRQDevtools(() => m.ReactQueryDevtools)
    );
  }, []);
  if (!RQDevtools) return null;
  const RQDT = RQDevtools;
  return (
    <Suspense fallback={null}>
      <RQDT initialIsOpen={false} />
    </Suspense>
  );
}

export default function ClientProviders({ children }) {
  return (
    <SessionProviderWrapper>
      <GlobalProvider>
        {/* react-hot-toast Toaster must live in a client component */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 5000,
            style: {
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: "14px",
            },
          }}
        />
        {children}
        <Devtools />
      </GlobalProvider>
    </SessionProviderWrapper>
  );
}
