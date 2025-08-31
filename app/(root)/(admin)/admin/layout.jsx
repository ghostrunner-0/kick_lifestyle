"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, usePathname } from "next/navigation";

import AppSidebar from "@/components/application/admin/AppSidebar";
import TopBar from "@/components/application/admin/TopBar";
import ThemeProvider from "@/components/application/admin/ThemeProvider";
import Loading from "@/components/application/admin/Loading";
import { showToast } from "@/lib/ShowToast";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

/* helpers */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return isDesktop;
}

function useLocalStorageBool(key, initial) {
  const [val, setVal] = useState(initial);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(key);
    if (raw === "true" || raw === "false") setVal(raw === "true");
  }, [key]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, String(val));
  }, [key, val]);
  return [val, setVal];
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // persist sidebar open/close (no more resets)
  const [sidebarOpen, setSidebarOpen] = useLocalStorageBool(
    "admin.sidebar.open",
    isDesktop // first mount default follows breakpoint
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get("/api/auth/check", {
          withCredentials: true,
        });
        if (!cancelled) {
          if (data?.success) setIsAdmin(true);
          else {
            showToast("error", "Unauthorized: Admin access required");
            router.push("/auth/login");
          }
        }
      } catch (err) {
        if (!cancelled) {
          showToast(
            "error",
            err?.response?.data?.message || err.message || "Authentication failed"
          );
          router.push("/auth/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (loading) return <Loading />;
  if (!isAdmin) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* controlled provider = state persists; no key() that remounts on route change */}
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        defaultOpen={isDesktop}
      >
        <AppSidebar />
        <SidebarInset className="flex min-h-dvh flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <div className="px-5 md:px-8 py-5">{children}</div>
          </main>
          <footer className="border-t h-10 flex justify-center items-center bg-muted/30 text-sm">
            {`© ${new Date().getFullYear()} KICK LIFESTYLE. All rights reserved.`}
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}
