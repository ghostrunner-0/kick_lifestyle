"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Login, logout } from "@/store/reducer/AuthReducer";

/**
 * Mirrors NextAuth session → Redux store once after persist rehydration.
 * If Redux already has a user, it won't overwrite (unless the email differs).
 */
export default function AuthHydrator() {
  const dispatch = useDispatch();
  const bootedRef = useRef(false);
  const hydrated = useSelector((s) => !!s?._persist?.rehydrated);
  const auth = useSelector((s) => s?.authStore?.auth);

  useEffect(() => {
    if (!hydrated || bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) dispatch(logout());
          return;
        }
        const json = await res.json();
        if (json?.success && json?.data) {
          const currentEmail = auth?.user?.email || auth?.email || null;
          if (!currentEmail || currentEmail !== json.data.email) {
            // Store shape works with your selectors: auth?.user || auth
            dispatch(Login({ user: json.data }));
          }
        }
      } catch {
        // no-op
      }
    })();
  }, [hydrated, dispatch]); // intentionally not depending on `auth` to avoid loops

  return null;
}
