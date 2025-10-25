// hooks/useFetch.js
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// single client with sane defaults
const api = axios.create({
  baseURL: "/",
  withCredentials: true,
  timeout: 6000, // <- prevents hangs
});

/**
 * useFetch(key, url, options)
 * options:
 *  - params: object -> appended as querystring
 *  - axios:  per-request axios config overrides
 *  - enabled, staleTime, gcTime, keepPreviousData, retry, refetchOnWindowFocus, select, placeholderData ...
 *
 * NOTE: Pass a *stable* key that includes identity (e.g. `reviews:summary:${productId}`)
 */
const buildUrl = (url, params) => {
  if (!params) return url;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return;
    Array.isArray(v) ? v.forEach((x) => qs.append(k, String(x))) : qs.set(k, String(v));
  });
  return `${url}${url.includes("?") ? "&" : "?"}${qs.toString()}`;
};

const useFetch = (key, url, options = {}) => {
  const {
    params,
    axios: axiosOverrides,
    enabled = !!url,
    staleTime = 30_000,        // prevent refetch spam while browsing
    gcTime = 5 * 60_000,       // 5m cache
    keepPreviousData = true,
    refetchOnWindowFocus = false,
    retry = (fails, err) => (err?.response?.status < 500 ? false : fails < 2),
    select,
    placeholderData,
    ...rest
  } = options;

  const finalUrl = useMemo(() => (url ? buildUrl(url, params) : ""), [url, params]);
  const queryKey = useMemo(() => [key, finalUrl], [key, finalUrl]);

  const queryFn = async ({ signal }) => {
    if (!finalUrl) return null;
    const res = await api.get(finalUrl, { signal, ...axiosOverrides });
    return res.data;
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    gcTime,
    keepPreviousData,
    refetchOnWindowFocus,
    retry,
    select,
    placeholderData,
    ...rest,
  });
};

export default useFetch;
