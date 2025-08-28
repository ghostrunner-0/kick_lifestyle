"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
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

export function ProductProvider({
  children,
  initialActiveKey = null,
  initialProducts = [],
}) {
  const { categories, isLoading: catLoading } = useCategories();
  const search = useSearchParams();

  const [activeKey, setActiveKeyState] = useState(initialActiveKey);
  const [seed, setSeed] = useState(initialProducts); // seed for current active
  const seededKeyRef = useRef(initialActiveKey);

  // Smooth UI update when switching categories
  const setActiveKey = useCallback((next) => {
    startTransition(() => {
      setActiveKeyState(next);
    });
  }, []);

  // If no activeKey yet (e.g., no initial provided), default to first category
  useEffect(() => {
    if (!catLoading && !activeKey && Array.isArray(categories) && categories.length) {
      const first = deriveKey(categories[0]);
      setActiveKeyState(first);
      setSeed([]); // no seed for this path; a fetch will occur
      seededKeyRef.current = null;
    }
  }, [catLoading, categories, activeKey]);

  // Filters
  const price = search.get("price");
  const warranty = search.get("warranty");
  const stock = search.get("stock");

  // Build URL only when we truly need to fetch
  const url = useMemo(() => {
    if (!activeKey) return null;
    // If we have a server seed for this exact category and there are no filters, skip fetching
    const usingSeed = seededKeyRef.current === activeKey && !price && !warranty && !stock && seed?.length;
    if (usingSeed) return null;

    let u = `/api/website/products?category=${encodeURIComponent(activeKey)}`;
    if (price) u += `&price=${encodeURIComponent(price)}`;
    if (warranty) u += `&warranty=${encodeURIComponent(warranty)}`;
    if (stock) u += `&stock=${encodeURIComponent(stock)}`;
    return u;
  }, [activeKey, price, warranty, stock, seed]);

  const {
    data: fetched,
    isLoading,
    error,
    refetch,
  } = useFetch(["website-products", activeKey, price, warranty, stock], url, {
    select: (res) => (Array.isArray(res?.data) ? res.data : []),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Cache for 2 minutes; tune per traffic/update cadence
    staleTime: 2 * 60 * 1000,
    // Only run when URL exists (i.e., seed is not being used)
    enabled: !!url,
    keepPreviousData: true,
  });

  // When we fetched fresh data for the current activeKey, drop the seed
  useEffect(() => {
    if (url && Array.isArray(fetched)) {
      setSeed([]);
      seededKeyRef.current = null;
    }
  }, [url, fetched]);

  // Exposed products = seed (SSR) OR fetched
  const products = seed?.length ? seed : (fetched || []);

  const refetchActive = useCallback(() => {
    if (url) refetch();
  }, [url, refetch]);

  // Prefetch next couple categories in idle time (tiny UX win)
  useEffect(() => {
    if (!categories?.length || !activeKey) return;

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const run = () => {
      const idx = categories.findIndex((c) => deriveKey(c) === activeKey);
      if (idx === -1) return;
      const nextCats = categories.slice(idx + 1, idx + 3); // prefetch 2
      nextCats.forEach((c) => {
        const k = deriveKey(c);
        fetch(`/api/website/products?category=${encodeURIComponent(k)}`, {
          signal: controller?.signal,
          cache: "force-cache",
        }).catch(() => {});
      });
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 1500 });
      return () => window.cancelIdleCallback && window.cancelIdleCallback(id);
    } else {
      const t = setTimeout(run, 800);
      return () => clearTimeout(t);
    }
  }, [categories, activeKey]);

  const value = useMemo(
    () => ({
      activeKey,
      setActiveKey,
      products,
      isLoading: !!url ? isLoading : false, // if using seed, not loading
      error,
      refetchActive,
    }),
    [activeKey, setActiveKey, products, isLoading, error, refetchActive, url]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts() {
  return useContext(ProductContext);
}
