"use client";
import React, { Suspense, useEffect } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import Loading from "./Loading";
import { persistor, store } from "@/store/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
const queryClient = new QueryClient();
const GlobalProvider = ({ children }) => {
  // Debug: check localStorage size and warn if large (can block persistor)
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const val = localStorage.getItem(key) || "";
          total += key.length + val.length;
        }
        // total is approximate char count; convert to KB
        const kb = Math.round((total / 1024) * 100) / 100;
        if (kb > 1024) {
          console.warn(`LocalStorage size ~${kb}KB (>1MB). Large persisted state may cause PersistGate to stay on loading.`);
        } else {
          console.info(`LocalStorage size ~${kb}KB`);
        }
      }
    } catch (e) {
      console.error("Failed to compute localStorage size", e);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        {/* Render children immediately so the app is usable while rehydration happens */}
        <PersistGate persistor={persistor} loading={null}>
          {children}
        </PersistGate>
      </Provider>
      <Suspense fallback={null}>
        <ReactQueryDevtools initialIsOpen={false} />
      </Suspense>
    </QueryClientProvider>
  );
};

export default GlobalProvider;
