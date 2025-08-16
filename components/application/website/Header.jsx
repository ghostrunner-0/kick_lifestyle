"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Logos
import LOGO_BLACK from "@/public/assets/images/logo-black.png";
import LOGO_WHITE from "@/public/assets/images/logo-white.png";

import { CATEGORY_VIEW_ROUTE, WEBSITE_HOME } from "@/routes/WebsiteRoutes";
import { Menu, Search, User, ShoppingCart, ChevronDown } from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// Categories (from single global fetch)
import { useCategories } from "@/components/providers/CategoriesProvider";

/* ------------------ Static (non-category) items ------------------ */
const STATIC_NAV = [
  {
    label: "Support & warranty",
    items: [
      { label: "Support", href: "/support" },
      { label: "Warranty", href: "/warranty" },
    ],
  },
  { label: "Corporate orders", href: "/corporate-orders" },
  {
    label: "More",
    items: [
      { label: "Blogs", href: "/blogs" },
      { label: "About Us", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Student Discount", href: "/student-discount" },
    ],
  },
];

const toTitle = (s) =>
  (s || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function Header() {
  const cartCount = 2; // replace with real state/store
  const [isSticky, setIsSticky] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === WEBSITE_HOME;

  // categories (single fetch globally)
  const { categories, isLoading } = useCategories();

  useEffect(() => {
    // track scroll only for home (overlay mode)
    if (!isHome) return;
    const onScroll = () => setIsSticky(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const catLinks = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    return list
      .filter((c) => c?.showOnWebsite)
      .map((c) => ({ label: toTitle(c?.name), href: CATEGORY_VIEW_ROUTE(c?.slug) }));
  }, [categories]);

  /* ------------------ Same width/padding everywhere ------------------ */
  const containerMaxW = "max-w-[1600px]";
  const containerPad = "[padding-inline:clamp(1rem,5vw,6rem)]";

  /* ------------------ Header styles ------------------ */
// Header styles
const headerCls = isHome
  ? [
      "fixed inset-x-0 top-0 z-50 transition-colors",
      isSticky
        ? "bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-b"
        : "bg-transparent",
    ].join(" ")
  : "sticky top-0 inset-x-0 z-50 bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur";


  const textCls = isHome ? (isSticky ? "text-gray-900" : "text-white") : "text-gray-900";
  const iconCls = textCls;
  const currentLogo = isHome && !isSticky ? LOGO_WHITE : LOGO_BLACK;
  const hoverUnderlineColor = "var(--primary)";

  return (
    <>
      <header className={headerCls}>
        <div className={`mx-auto ${containerMaxW} ${containerPad} flex items-center justify-between lg:py-5 py-3`}>
          {/* Left: mobile trigger + (desktop logo) */}
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu" className={iconCls + " hover:bg-transparent"}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="left"
                className="
                  w-[80%] sm:w-[380px] p-0 flex flex-col
                  [&>button.absolute.right-4.top-4]:hidden
                "
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                  <Image src={LOGO_BLACK} alt="KICK" width={110} height={40} className="object-contain" priority />
                  <SheetClose asChild>
                    <button className="h-9 w-9 rounded-full bg-black/5 hover:bg-black/10">
                      <span className="sr-only">Close</span>✕
                    </button>
                  </SheetClose>
                </div>

                {/* Sidebar nav */}
                <nav className="p-3">
                  <ul className="space-y-2">
                    {isLoading && <li className="px-4 py-2 text-sm text-muted-foreground">Loading…</li>}

                    {!isLoading &&
                      catLinks.map((item) => (
                        <li key={item.label}>
                          <SheetClose asChild>
                            <Link href={item.href} className="block rounded-lg px-4 h-12 leading-[48px] text-[15px] font-medium hover:bg-muted">
                              {item.label}
                            </Link>
                          </SheetClose>
                        </li>
                      ))}

                    {STATIC_NAV.map((item) =>
                      item.items ? (
                        <li key={item.label}>
                          <Accordion type="single" collapsible>
                            <AccordionItem value={item.label} className="border-0">
                              <AccordionTrigger className="px-4 h-12 text-[15px] font-medium hover:no-underline rounded-lg data-[state=closed]:hover:bg-muted/60 data-[state=open]:bg-muted">
                                {item.label}
                              </AccordionTrigger>
                              <AccordionContent className="px-1 pb-2">
                                <ul className="space-y-1">
                                  {item.items.map((child) => (
                                    <li key={child.label}>
                                      <SheetClose asChild>
                                        <Link href={child.href} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted">
                                          <span>{child.label}</span>
                                        </Link>
                                      </SheetClose>
                                    </li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </li>
                      ) : (
                        <li key={item.label}>
                          <SheetClose asChild>
                            <Link href={item.href} className="block rounded-lg px-4 h-12 leading-[48px] text-[15px] font-medium hover:bg-muted">
                              {item.label}
                            </Link>
                          </SheetClose>
                        </li>
                      )
                    )}
                  </ul>
                </nav>

                {/* Drawer footer */}
                <div className="mt-auto border-t">
                  <div className="p-3">
                    <SheetClose asChild>
                      <Link
                        href="/auth/login"
                        className="flex items-center justify-center gap-2 rounded-lg border bg-white hover:bg-muted h-11 px-4 text-sm font-medium"
                        title="Login / Register"
                      >
                        <User className="h-5 w-5" />
                        <span>Login / Register</span>
                      </Link>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop: Logo */}
            <div className="hidden lg:block">
              <Link href={WEBSITE_HOME} className="block">
                <Image src={currentLogo} height={146} width={383} alt="KICK" className="w-32" priority />
              </Link>
            </div>
          </div>

          {/* Center: mobile logo OR desktop nav */}
          <div className="flex-1 flex justify-center min-w-0">
            {/* Mobile centered logo */}
            <Link href={WEBSITE_HOME} className="lg:hidden block">
              <Image src={currentLogo} height={146} width={383} alt="KICK" className="w-24" priority />
            </Link>

            {/* Desktop nav */}
            <nav className={`hidden lg:flex items-center gap-6 relative whitespace-nowrap ${textCls}`}>
              {/* Dynamic category links */}
              {catLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`nav-link-underline text-sm font-medium tracking-wide h-10 flex items-center px-1 whitespace-nowrap ${textCls}`}
                >
                  {item.label}
                </Link>
              ))}

              {/* Static dropdowns / links */}
              {STATIC_NAV.map((item) =>
                item.items ? (
                  <div key={item.label} className="relative group">
                    <button
                      className={`nav-link-underline inline-flex items-center gap-1 text-sm font-medium tracking-wide h-10 px-1 whitespace-nowrap ${textCls}`}
                      aria-haspopup="menu"
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-500 group-hover:rotate-180 ${iconCls}`} />
                    </button>

                    {/* Dropdown */}
                    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 mt-3 min-w-[240px] rounded-md border bg-white shadow-lg">
                      <ul className="py-2">
                        {item.items.map((child) => (
                          <li key={child.label}>
                            <Link href={child.href} className="block px-4 py-2.5 text-sm hover:bg-gray-50 whitespace-nowrap text-gray-900">
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`nav-link-underline text-sm font-medium tracking-wide h-10 flex items-center px-1 whitespace-nowrap ${textCls}`}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className={`hidden lg:inline-flex hover:bg-transparent ${iconCls}`} aria-label="Search" title="Search">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className={`hidden lg:inline-flex hover:bg-transparent ${iconCls}`} aria-label="Account" title="Account">
              <User className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <Link
              href="/cart"
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-md ${iconCls}`}
              aria-label="Cart"
              title="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 grid place-items-center rounded-full bg-black text-white text-[10px] h-4 min-w-4 px-1 leading-[16px]">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* underline animation */}
      <style jsx global>{`
        :root { --primary: oklch(0.795 0.184 86.047); }
        .nav-link-underline { position: relative; }
        .nav-link-underline::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -2px;
          height: 2px;
          width: 0;
          background: ${hoverUnderlineColor};
          transition: width 500ms ease;
        }
        .nav-link-underline:hover::after, .group:hover .nav-link-underline::after { width: 100%; }
      `}</style>
    </>
  );
}
