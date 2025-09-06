// components/providers/CategoriesProvider.jsx
"use client";

import { createContext, useContext, useMemo } from "react";
import useFetch from "@/hooks/useFetch";

const CategoriesContext = createContext({
  categories: [],
  isLoading: true,
  error: null,
  refetch: () => {},
});

export function CategoriesProvider({ children, initialCategories = [] }) {
  const hasInitial = Array.isArray(initialCategories) && initialCategories.length > 0;

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useFetch("website-categories", "/api/website/category", {
    // Use initial data only for first paint, then replace with fresh fetch.
    initialData: hasInitial ? initialCategories : undefined,

    // Works with either { data: [...] } or [...] responses
    select: (res) => {
      const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return arr.filter((c) => c?.showOnWebsite);
    },

    // Make sure we always get fresh data after any mutation / page load
    staleTime: 0,                  // never consider cached data fresh
    refetchOnMount: "always",      // force fetch on mount/navigation
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,   // optional; keep false if you prefer
  });

  // Prefer fresh data when present; fall back to initial while it loads
  const categories = (data ?? (hasInitial ? initialCategories : []));
  const loading = !data && (isLoading || isFetching);

  const value = useMemo(
    () => ({ categories, isLoading: loading, error, refetch }),
    [categories, loading, error, refetch]
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  return useContext(CategoriesContext);
}
