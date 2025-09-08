// app/(root)/(admin)/admin/layout.jsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import TopBar from "@/components/application/admin/TopBar";
import ThemeProvider from "@/components/application/admin/ThemeProvider";
import Loading from "@/components/application/admin/Loading";
import { showToast } from "@/lib/ShowToast";
import { getAdminSidebar } from "@/lib/AdminSiderbarMenu";

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/auth/check", { withCredentials: true });
        if (!data?.success) throw new Error(data?.message || "Unauthorized");
        setRole(data.role || "admin");
      } catch (e) {
        showToast("error", e?.response?.data?.message || e.message || "Unauthorized: Admin portal access required");
        // redirect to login/home if you want
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (!role) return null;

  const menu = getAdminSidebar(role);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SidebarProvider>
        <AppSidebar menu={menu} /> {/* <-- pass filtered menu */}
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
