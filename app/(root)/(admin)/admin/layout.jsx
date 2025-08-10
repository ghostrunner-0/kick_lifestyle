"use client";

import React, { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

import AppSidebar from "@/components/application/admin/AppSidebar";
import TopBar from "@/components/application/admin/TopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import ThemeProvider from "@/components/application/admin/ThemeProvider";
import Loading from "@/components/application/admin/Loading";

const Layout = ({ children }) => {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn(); // Redirect to sign in page
    }
  }, [status]);

  if (status === "loading") {
    return <Loading />;
  }

  const isAdmin = session?.user?.role === "admin" || session?.user?.isAdmin;

  if (!session) {
    return null; // while redirecting to sign in
  }

  if (!isAdmin) {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return null;
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

          <div className="pt-[70px] px-8 min-h-[calc(100vh-40px)] pb-10">
            {children}
          </div>

          <div className="border-t h-[40px] flex justify-center items-center bg-gray-50 dark:bg-background text-sm">
            {`© ${new Date().getFullYear()} KICK LIFESTYLE. All rights reserved.`}
          </div>
        </main>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Layout;
