// components/providers/CategoriesProvider.jsx
"use client";

import { createContext, useContext, useMemo } from "react";
import useFetch from "@/hooks/useFetch";

const CategoriesContext = createContext({
  categories: [],
  isLoading: true,
  error: null,
});

export function CategoriesProvider({ children, initialCategories = [] }) {
  const hasInitial = Array.isArray(initialCategories) && initialCategories.length > 0;

  const { data, isLoading, error } = useFetch(
    "website-categories",
    "/api/website/category",
    {
      // hydrate cache so background refetch still works
      initialData: hasInitial ? initialCategories : undefined,
      // ❤️ make select handle BOTH { data: [...] } and [...] shapes
      select: (res) => {
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return arr.filter((c) => c?.showOnWebsite);
      },
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  // If we have initial, show it immediately and don't show loading on first paint
  const categories = hasInitial ? initialCategories : (data ?? []);
  const loading = hasInitial ? false : isLoading;

  const value = useMemo(
    () => ({ categories, isLoading: loading, error }),
    [categories, loading, error]
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  return useContext(CategoriesContext);
}
