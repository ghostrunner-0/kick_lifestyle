// lib/logout.js
"use client";

import { signOut } from "next-auth/react";
import { store, persistor } from "@/store/store"; // ← your file is store/store.js
import { logout as logoutAction } from "@/store/reducer/AuthReducer";

/**
 * Fully logs the user out:
 *  1) Clears your custom HttpOnly cookie(s) via API
 *  2) Signs out NextAuth (clears NextAuth cookies)
 *  3) Resets Redux + purges redux-persist
 *  4) Redirects
 */
export async function logout({ redirectTo = "/auth/login" } = {}) {
  try {
    // 1) Clear any custom cookies you set during login
    await fetch("/api/auth/custom-logout", { method: "POST" });

    // 2) Invalidate NextAuth session/cookies
    await signOut({ redirect: false });

    // 3) Reset Redux and clear persisted cache
    store.dispatch(logoutAction()); // triggers rootReducer reset
    await persistor.flush();
    await persistor.purge();
    // localStorage.removeItem("persist:root"); // optional belt-and-suspenders

    // 4) Redirect
    if (typeof window !== "undefined") {
      window.location.assign(redirectTo);
    }
  } catch (e) {
    console.error("Full logout failed:", e);
    if (typeof window !== "undefined") {
      window.location.assign(redirectTo);
    }
  }
}
