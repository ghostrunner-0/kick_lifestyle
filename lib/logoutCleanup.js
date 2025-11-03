// lib/logoutCleanup.js
export async function logoutCleanup(opts = {}) {
  const { localStoragePrefix = "kick_", unregisterServiceWorkers = false } =
    opts;

  try {
    // 1️⃣ Clear Redux auth state
    try {
      const { store } = await import("../store/store"); // export { store } from your store setup
      const { logout } = await import("@/store/reducer/AuthReducer");
      store.dispatch(logout());
    } catch (err) {
      console.warn("Redux cleanup skipped:", err.message);
    }

    // 2️⃣ Clear localStorage / sessionStorage keys
    try {
      if (typeof window !== "undefined") {
        [localStorage, sessionStorage].forEach((store) => {
          if (!store) return;
          const keys = Object.keys(store);
          keys.forEach((k) => {
            if (k.startsWith(localStoragePrefix)) store.removeItem(k);
          });
        });
      }
    } catch (err) {
      console.warn("Storage cleanup skipped:", err.message);
    }

    // 3️⃣ Clear browser cache (Next.js images, API, etc.)
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch (err) {
      console.warn("Cache cleanup skipped:", err.message);
    }

    // 4️⃣ Optional — unregister service workers if you have any
    try {
      if (
        unregisterServiceWorkers &&
        typeof navigator !== "undefined" &&
        "serviceWorker" in navigator
      ) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (err) {
      console.warn("Service worker cleanup skipped:", err.message);
    }

    // 5️⃣ Drop axios default Authorization header (optional)
    try {
      const axios = (await import("axios")).default;
      if (axios?.defaults?.headers?.common?.Authorization) {
        delete axios.defaults.headers.common.Authorization;
      }
    } catch (_) {}
  } catch (error) {
    console.error("logoutCleanup error:", error);
  }
}
