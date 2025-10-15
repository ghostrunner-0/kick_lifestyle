"use client";

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@/store/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Create a module-level singleton QueryClient to avoid re-instantiation on HMR */
let _queryClient;
function getQueryClient() {
  if (!_queryClient) {
    _queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // keep SSR/client consistent, avoid immediate refetch on mount if you SSR some pages
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return _queryClient;
}

const GlobalProvider = ({ children }) => {
  // Optional: lightweight localStorage size check (client only)
  useEffect(() => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key) || "";
        total += key.length + val.length;
      }
      const kb = Math.round((total / 1024) * 100) / 100;
      if (kb > 1024) {
        console.warn(
          `LocalStorage size ~${kb}KB (>1MB). Large persisted state may delay rehydration.`
        );
      }
    } catch (e) {
      // non-blocking
    }
  }, []);

  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        {/* Show children immediately; PersistGate will rehydrate Redux silently */}
        <PersistGate persistor={persistor} loading={null}>
          {children}
        </PersistGate>
      </Provider>
    </QueryClientProvider>
  );
};

export default GlobalProvider;
