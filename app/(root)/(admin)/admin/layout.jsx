"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import TopBar from "@/components/application/admin/TopBar";
import ThemeProvider from "@/components/application/admin/ThemeProvider";
import Loading from "@/components/application/admin/Loading";
import { showToast } from "@/lib/ShowToast";

import { roleCanAccessPath, getDefaultLandingForRole } from "@/lib/AdminAccess";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get("/api/auth/check", { withCredentials: true });
        if (!data?.success || !data?.role) throw new Error("Unauthorized");
        if (!cancelled) setRole(data.role);
      } catch (e) {
        if (!cancelled) {
          showToast("error", "Unauthorized: Admin portal access required");
          router.replace("/auth/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!role) return;
    if (!roleCanAccessPath(role, pathname)) {
      const target = getDefaultLandingForRole(role);
      showToast("warning", "You don’t have access to that page.");
      router.replace(target);
    }
  }, [role, pathname, router]);

  if (loading) return <Loading />;
  if (!role) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SidebarProvider>
        {/* pass role so sidebar filters correctly */}
        <AppSidebar role={role} />
        <SidebarInset className="flex min-h-dvh flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <div className="px-5 md:px-8 py-5">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}
