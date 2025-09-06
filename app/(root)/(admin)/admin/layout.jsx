"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, usePathname } from "next/navigation";

import  AppSidebar  from "@/components/app-sidebar"; // <-- default import
import TopBar from "@/components/application/admin/TopBar";
import ThemeProvider from "@/components/application/admin/ThemeProvider";
import Loading from "@/components/application/admin/Loading";
import { showToast } from "@/lib/ShowToast";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // start closed on SSR & first client render; update after mount
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // hydrate sidebar state after mount (localStorage or media query)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("admin.sidebar.open");
      if (saved === "true" || saved === "false") {
        setSidebarOpen(saved === "true");
      } else {
        setSidebarOpen(window.matchMedia("(min-width: 1024px)").matches);
      }
    } catch {}
  }, []);

  // persist sidebarOpen
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("admin.sidebar.open", String(sidebarOpen));
    } catch {}
  }, [sidebarOpen]);

  // keep in sync with breakpoint changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setSidebarOpen(Boolean(e.matches));
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get("/api/auth/check", { withCredentials: true });
        if (!cancelled) {
          if (data?.success) setIsAdmin(true);
          else {
            showToast("error", "Unauthorized: Admin access required");
            router.push("/auth/login");
          }
        }
      } catch (err) {
        if (!cancelled) {
          showToast("error", err?.response?.data?.message || err.message || "Authentication failed");
          router.push("/auth/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (loading) return <Loading />;
  if (!isAdmin) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
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
