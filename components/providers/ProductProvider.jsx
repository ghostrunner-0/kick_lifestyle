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

function buildFilterKey({ price, warranty, stock }) {
  return [
    price ? `p=${price}` : "",
    warranty ? `w=${warranty}` : "",
    stock ? `s=${stock}` : "",
  ]
    .filter(Boolean)
    .join("&");
}

function buildUrl(activeKey, { price, warranty, stock }) {
  if (!activeKey) return null;

  const params = new URLSearchParams();
  params.set("category", activeKey);
  if (price) params.set("price", price);
  if (warranty) params.set("warranty", warranty);
  if (stock) params.set("stock", stock);

  return `/api/website/products?${params.toString()}`;
}

export function ProductProvider({
  children,
  initialActiveKey = null,
  initialProducts = [],
}) {
  const { categories, isLoading: catLoading } = useCategories();
  const search = useSearchParams();

  const [activeKey, setActiveKeyState] = useState(initialActiveKey || null);

  // Cache: { [compositeKey]: { items } }
  const [cache, setCache] = useState(() => {
    if (
      initialActiveKey &&
      Array.isArray(initialProducts) &&
      initialProducts.length
    ) {
      const fk = buildFilterKey({ price: null, warranty: null, stock: null });
      const compositeKey = `${initialActiveKey}::${fk}`;
      return {
        [compositeKey]: { items: initialProducts },
      };
    }
    return {};
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const seededKeyRef = useRef(
    initialActiveKey && Array.isArray(initialProducts) && initialProducts.length
      ? initialActiveKey
      : null
  );

  // Track in-flight requests to avoid duplicates (including Strict Mode)
  const inFlight = useRef(new Set());
  // Track prefetched keys so we don't spam
  const prefetched = useRef(new Set());

  const setActiveKey = useCallback(
    (next) => {
      if (!next || next === activeKey) return;
      startTransition(() => {
        setActiveKeyState(next);
      });
    },
    [activeKey]
  );

  // If no activeKey from SSR, pick first visible category
  useEffect(() => {
    if (catLoading) return;
    if (activeKey) return;
    if (!Array.isArray(categories) || !categories.length) return;

    const first = deriveKey(categories[0]);
    setActiveKeyState(first);
    seededKeyRef.current = null; // this path has no SSR seed
  }, [catLoading, categories, activeKey]);

  // Current filters from URL
  const price = search.get("price");
  const warranty = search.get("warranty");
  const stock = search.get("stock");

  const filterKey = useMemo(
    () => buildFilterKey({ price, warranty, stock }),
    [price, warranty, stock]
  );

  const compositeKey = useMemo(() => {
    if (!activeKey) return null;
    return `${activeKey}::${filterKey}`;
  }, [activeKey, filterKey]);

  const noFilters = !price && !warranty && !stock;

  // Decide products for current view from cache or seed
  const products = useMemo(() => {
    if (!activeKey) return [];

    // 1) If we have cached data for this compositeKey, use it
    if (compositeKey && cache[compositeKey]?.items) {
      return cache[compositeKey].items;
    }

    // 2) If no filters and SSR seed matches this activeKey, use seed (baked into cache init)
    if (noFilters && seededKeyRef.current === activeKey) {
      const fk = buildFilterKey({ price: null, warranty: null, stock: null });
      const seedKey = `${activeKey}::${fk}`;
      return cache[seedKey]?.items || [];
    }

    return [];
  }, [activeKey, compositeKey, cache, noFilters]);

  // Core fetcher (single source of truth)
  const fetchProducts = useCallback(
    async ({ key, url, isRefetch = false }) => {
      if (!key || !url) return;

      // Avoid duplicate in-flight requests
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);

      if (!isRefetch) {
        setIsLoading(true);
        setError(null);
      }

      const controller =
        typeof AbortController !== "undefined" ? new AbortController() : null;

      try {
        const res = await fetch(url, {
          signal: controller?.signal,
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !Array.isArray(json?.data)) {
          throw new Error(json?.message || "Failed to load products");
        }

        setCache((prev) => ({
          ...prev,
          [key]: { items: json.data },
        }));

        // Once we’ve fetched for this key, this page is no longer “seed-only”
        if (noFilters && activeKey && key.startsWith(`${activeKey}::`)) {
          seededKeyRef.current = null;
        }
      } catch (err) {
        console.error("Product fetch failed:", err);
        if (!isRefetch) {
          setError(err.message || "Failed to load products");
        }
      } finally {
        inFlight.current.delete(key);
        if (!isRefetch) setIsLoading(false);
      }

      return () => controller?.abort();
    },
    [activeKey, noFilters]
  );

  // Fetch for current activeKey + filters if:
  // - we don't have cache
  // - and (no SSR seed case OR filters present)
  useEffect(() => {
    if (!activeKey || !compositeKey) return;

    // Already cached? don't fetch.
    if (cache[compositeKey]?.items) return;

    // If we *still* have SSR seed and no filters for this activeKey, don't fetch.
    if (noFilters && seededKeyRef.current === activeKey) return;

    const url = buildUrl(activeKey, { price, warranty, stock });
    if (!url) return;

    fetchProducts({ key: compositeKey, url });
  }, [
    activeKey,
    compositeKey,
    cache,
    noFilters,
    price,
    warranty,
    stock,
    fetchProducts,
  ]);

  // Public refetch for current activeKey/filters (manual only)
  const refetchActive = useCallback(() => {
    if (!activeKey || !compositeKey) return;
    const url = buildUrl(activeKey, { price, warranty, stock });
    if (!url) return;
    fetchProducts({ key: compositeKey, url, isRefetch: true });
  }, [activeKey, compositeKey, price, warranty, stock, fetchProducts]);

  // Idle prefetch: next 1–2 categories (no filters). One-time per key.
  useEffect(() => {
    if (!Array.isArray(categories) || !activeKey) return;

    const idx = categories.findIndex((c) => deriveKey(c) === activeKey);
    if (idx === -1) return;

    const nextCats = categories.slice(idx + 1, idx + 3);

    const run = () => {
      nextCats.forEach((c) => {
        const k = deriveKey(c);
        if (!k) return;

        const fk = buildFilterKey({ price: null, warranty: null, stock: null });
        const key = `${k}::${fk}`;

        // Already cached, in-flight, or prefetched? skip.
        if (cache[key]?.items) return;
        if (inFlight.current.has(key)) return;
        if (prefetched.current.has(key)) return;

        const url = buildUrl(k, { price: null, warranty: null, stock: null });
        if (!url) return;

        prefetched.current.add(key);
        fetch(url, { cache: "force-cache" }).catch(() => {
          // ignore prefetch errors
        });
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 1500 });
      return () => window.cancelIdleCallback && window.cancelIdleCallback(id);
    } else {
      const t = setTimeout(run, 800);
      return () => clearTimeout(t);
    }
  }, [categories, activeKey, cache]);

  const value = useMemo(
    () => ({
      activeKey,
      setActiveKey,
      products,
      isLoading,
      error,
      refetchActive,
    }),
    [activeKey, setActiveKey, products, isLoading, error, refetchActive]
  );

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProducts must be used within ProductProvider");
  return ctx;
}
