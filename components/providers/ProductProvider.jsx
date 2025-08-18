// components/providers/ProductProvider.jsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import useFetch from "@/hooks/useFetch";
import { useCategories } from "@/components/providers/CategoriesProvider";
import { useSearchParams } from "next/navigation";

export function deriveKey(c) {
  return c?.slug ?? c?._id ?? c?.id ?? (c?.name || "").toLowerCase();
}

const ProductContext = createContext({
  activeKey: null,
  setActiveKey: () => {},
  products: [],
  isLoading: false,
  error: null,
  refetchActive: () => {},
});

export function ProductProvider({ children }) {
  const { categories, isLoading: catLoading } = useCategories();
  const [activeKey, setActiveKey] = useState(null);
  const search = useSearchParams();

  // Ensure we ALWAYS have an initial category key when categories load
  useEffect(() => {
    if (!catLoading && !activeKey && Array.isArray(categories) && categories.length) {
      setActiveKey(deriveKey(categories[0]));
    }
  }, [catLoading, categories, activeKey]);

  // Read filter params from URL
  const price = search.get("price");
  const warranty = search.get("warranty");
  const stock = search.get("stock");

  let url = activeKey
    ? `/api/website/products?category=${encodeURIComponent(activeKey)}`
    : null;
  if (price) url += `&price=${encodeURIComponent(price)}`;
  if (warranty) url += `&warranty=${encodeURIComponent(warranty)}`;
  if (stock) url += `&stock=${encodeURIComponent(stock)}`;

  const { data, isLoading, error, refetch } = useFetch(
    "website-products",
    url,
    {
      select: (res) => (Array.isArray(res?.data) ? res.data : []),
      // Optional smoothness:
      // placeholderData: (prev) => prev, // keep previous list while switching tabs
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 2 * 60 * 1000,
    }
  );

  const refetchActive = useCallback(() => {
    if (url) refetch();
  }, [url, refetch]);

  const value = useMemo(
    () => ({
      activeKey,
      setActiveKey,
      products: data ?? [],
      isLoading,
      error,
      refetchActive,
    }),
    [activeKey, data, isLoading, error, refetchActive]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts() {
  return useContext(ProductContext);
}
