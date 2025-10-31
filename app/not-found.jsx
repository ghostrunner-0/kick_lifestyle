"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/* ---------- ADMIN: you can use the real Admin layout (client) ---------- */
import AdminLayout from "@/app/(root)/(admin)/admin/layout";

/* ---------- WEBSITE: recompose a light shell (DO NOT import async layout) ---------- */
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { CategoriesProvider } from "@/components/providers/CategoriesProvider";
import { ProductProvider } from "@/components/providers/ProductProvider";
import AuthHydrator from "@/components/providers/AuthHydrator";
import Header from "@/components/application/website/Header";
import Footer from "@/components/application/website/Footer";
import BottomNav from "@/components/application/website/BottomNav";

const BRAND = "KICK LIFESTYLE";

/* ===== Website 404 UI ===== */
function Website404() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          404 — Not Found
        </p>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold">
          Oops! This page doesn’t exist.
        </h1>
        <p className="mt-2 text-muted-foreground">
          The link you followed might be broken, or the page may have been
          moved.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/support">Help Center</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {BRAND} • Proudly Nepali
        </p>
      </div>
    </main>
  );
}

/* ===== Admin 404 UI ===== */
function Admin404() {
  return (
    <div className="min-h-[60vh] grid place-items-center px-4 py-16">
      <div className="text-center max-w-md">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Admin 404
        </p>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold">
          Admin page not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          The route doesn’t exist or your session may have expired.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/admin">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/login">Sign in</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Back to Website</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {BRAND} • Admin Portal
        </p>
      </div>
    </div>
  );
}

/* ===== Lightweight Website shell that mimics (website)/layout without async fetch ===== */
function WebsiteShell({ children }) {
  return (
    <ReactQueryProvider>
      <AuthHydrator />
      <CategoriesProvider initialCategories={[]}>
        <ProductProvider initialActiveKey={null} initialProducts={[]}>
          <Header />
          <main className="pb-16 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
        </ProductProvider>
      </CategoriesProvider>
    </ReactQueryProvider>
  );
}

/* ===== Global NotFound that switches by path ===== */
export default function NotFound() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return (
      <AdminLayout>
        <Admin404 />
      </AdminLayout>
    );
  }

  return (
    <WebsiteShell>
      <Website404 />
    </WebsiteShell>
  );
}
