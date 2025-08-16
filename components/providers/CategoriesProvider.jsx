"use client";
import { createContext, useContext, useMemo } from "react";
import useFetch from "@/hooks/useFetch";

const CategoriesContext = createContext({
  categories: [],
  isLoading: true,
  error: null,
});

export function CategoriesProvider({ children }) {
  const { data, isLoading, error } = useFetch(
    "website-categories",                 // cache key (stable across app)
    "/api/website/category",              // single endpoint
    {
      select: (res) =>
        Array.isArray(res?.data)
          ? res.data.filter((c) => c?.showOnWebsite)
          : [],
      // optional overrides, but ReactQueryProvider already sets good defaults
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const value = useMemo(
    () => ({ categories: data ?? [], isLoading, error }),
    [data, isLoading, error]
  );

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesContext);
}
