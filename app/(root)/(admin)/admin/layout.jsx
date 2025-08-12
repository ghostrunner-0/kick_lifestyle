"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, usePathname } from "next/navigation";

import AppSidebar from "@/components/application/admin/AppSidebar";
import TopBar from "@/components/application/admin/TopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import ThemeProvider from "@/components/application/admin/ThemeProvider";
import Loading from "@/components/application/admin/Loading";
import { showToast } from "@/lib/ShowToast";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname(); // Reacts on every route change
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const { data: res } = await axios.get("/api/auth/check", {
          withCredentials: true,
        });
        if (res.success) {
          setIsAdmin(true);
        } else {
          showToast("error", "Unauthorized: Admin access required");
          router.push("/auth/login");
        }
      } catch (err) {
        showToast("error", err.response?.data?.message || err.message || "Authentication failed");
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]); // re-run on route change

  if (loading) {
    return <Loading />;
  }

  if (!isAdmin) {
    return null; // fallback while redirecting
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider>
        <AppSidebar />

        <main className="0 md:w-[calc(100vw-16rem)]">
          <TopBar />

          <div className="pt-[70px] px-8 min-h-[calc(100vh-40px)] pb-10">{children}</div>

          <div className="border-t h-[40px] flex justify-center items-center bg-gray-50 dark:bg-background text-sm">
            {`© ${new Date().getFullYear()} KICK LIFESTYLE. All rights reserved.`}
          </div>
        </main>
      </SidebarProvider>
    </ThemeProvider>
  );
}
