"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
/* Sidebars */
import CartSidebar from "./CartSidebar";
import SearchSidebar from "@/components/application/SearchSidebar";

/* Redux */
import { useSelector } from "react-redux";
import { selectCartCount, selectUniqueCount } from "@/store/cartSlice";

/* Assets */
import LOGO_BLACK from "@/public/assets/images/logo-black.png";
import LOGO_WHITE from "@/public/assets/images/logo-white.png";

/* Routes + Icons */
import { CATEGORY_VIEW_ROUTE } from "@/routes/WebsiteRoutes";
import { Menu, Search, User, ShoppingCart, ChevronDown } from "lucide-react";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

/* Categories */
import { useCategories } from "@/components/providers/CategoriesProvider";

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
    ],
  },
  { label: "Student Discount", href: "/student-discount" },
];

const toTitle = (s) =>
  (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const PORTAL_ROLES = new Set(["admin", "sales", "editor"]);
const LS_ROLE_KEY = "auth.role";

const pickRole = (json) =>
  json?.role ||
  json?.data?.role ||
  json?.user?.role ||
  json?.data?.user?.role ||
  null;

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const cartCount = useSelector(selectCartCount);
  const uniqueCount = useSelector(selectUniqueCount);

  const [isStickyShade, setIsStickyShade] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [products, setProducts] = useState([]);

  const { categories, isLoading } = useCategories();

  const [accountHref, setAccountHref] = useState("/auth/login");
  const [accountLabel, setAccountLabel] = useState("Login / Register");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const role = localStorage.getItem(LS_ROLE_KEY);
      if (role && PORTAL_ROLES.has(role)) {
        setAccountHref("/admin/dashboard");
        setAccountLabel("Dashboard");
      } else if (role === "user") {
        setAccountHref("/account");
        setAccountLabel("My Account");
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      const setForRole = (role) => {
        if (!role) {
          setAccountHref("/auth/login");
          setAccountLabel("Login / Register");
          return;
        }
        if (PORTAL_ROLES.has(role)) {
          setAccountHref("/admin/dashboard");
          setAccountLabel("Dashboard");
        } else if (role === "user") {
          setAccountHref("/account");
          setAccountLabel("My Account");
        } else {
          setAccountHref("/account");
          setAccountLabel("My Account");
        }
      };

      try {
        const res = await fetch("/api/auth/check", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (res.ok) {
          const json = await res.json();
          const role = pickRole(json);
          if (!cancelled) {
            setForRole(role);
            try {
              localStorage.setItem(LS_ROLE_KEY, role || "");
            } catch {}
          }
          return;
        }
      } catch {}

      try {
        const res2 = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (res2.ok) {
          const json2 = await res2.json();
          const role =
            pickRole(json2) ||
            (json2?.data ? json2.data.role : json2?.user?.role) ||
            null;

          if (!cancelled) {
            setForRole(role);
            try {
              localStorage.setItem(LS_ROLE_KEY, role || "");
            } catch {}
          }
          return;
        }
      } catch {}

      if (!cancelled) {
        setAccountHref("/auth/login");
        setAccountLabel("Login / Register");
        try {
          localStorage.removeItem(LS_ROLE_KEY);
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setIsStickyShade(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const catLinks = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    return list
      .filter((c) => c?.showOnWebsite)
      .map((c) => ({
        label: toTitle(c?.name),
        href: CATEGORY_VIEW_ROUTE(c?.slug),
      }));
  }, [categories]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/website/search-index");
        const json = await res.json();
        if (!cancel) setProducts(json?.products || []);
      } catch {
        if (!cancel) setProducts([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const handleSelectProduct = (p) => {
    const slug = p?.slug || p?.data?.slug;
    const id = p?.id || p?.product_id || p?._id;
    const href = slug ? `/product/${slug}` : id ? `/product/${id}` : "/";
    router.push(href);
  };

  const headerCls = isHome
    ? [
        "fixed inset-x-0 top-0 z-[40] transition-colors",
        isStickyShade
          ? "bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-b"
          : "bg-transparent",
      ].join(" ")
    : "fixed inset-x-0 top-0 z-[40] bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur";

  const textCls = isHome
    ? isStickyShade
      ? "text-gray-900"
      : "text-white"
    : "text-gray-900";
  const currentLogo = isHome && !isStickyShade ? LOGO_WHITE : LOGO_BLACK;

  useEffect(() => {
    const openSearch = () => setSearchOpen(true);
    const openCart = () => setCartOpen(true);
    window.addEventListener("openSearch", openSearch);
    window.addEventListener("openCart", openCart);
    return () => {
      window.removeEventListener("openSearch", openSearch);
      window.removeEventListener("openCart", openCart);
    };
  }, []);

  const headerRef = useRef(null);
  useLayoutEffect(() => {
    const setVar = () => {
      const h = headerRef.current?.getBoundingClientRect().height ?? 64;
      document.documentElement.style.setProperty(
        "--site-header-h",
        `${Math.round(h)}px`
      );
      window.dispatchEvent(new Event("header:resize"));
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", setVar);
    window.addEventListener("scroll", setVar, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
      window.removeEventListener("scroll", setVar);
    };
  }, []);

  return (
    <>
      <header ref={headerRef} className={headerCls}>
        <div
          className={`w-full flex items-center relative justify-between py-4 px-6 md:px-10 lg:px-16 text-black`}
        >
          {/* Left: Mobile menu + Desktop logo */}
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className={textCls + " hover:bg-transparent"}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="left"
                className="w-[80%] sm:w-[380px] p-0 flex flex-col [&>button.absolute.right-4.top-4]:hidden"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Main navigation</SheetTitle>
                </SheetHeader>

                <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                  <Image
                    src={LOGO_BLACK}
                    alt="KICK"
                    width={110}
                    height={40}
                    className="object-contain"
                    priority
                  />
                  <SheetClose asChild>
                    <button className="h-9 w-9 rounded-full bg-black/5 hover:bg-black/10">
                      ✕
                    </button>
                  </SheetClose>
                </div>

                <div className="p-3 border-b">
                  <Button
                    onClick={() => setSearchOpen(true)}
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search products</span>
                  </Button>
                </div>

                <nav className="p-3">
                  <ul className="space-y-2">
                    {isLoading && (
                      <li className="px-4 py-2 text-sm text-muted-foreground">
                        Loading…
                      </li>
                    )}

                    {!isLoading &&
                      catLinks.map((item) => (
                        <li key={item.label}>
                          <SheetClose asChild>
                            <Link
                              href={item.href}
                              className="block rounded-lg px-4 h-12 leading-[48px] text-[15px] font-medium hover:bg-muted"
                            >
                              {item.label}
                            </Link>
                          </SheetClose>
                        </li>
                      ))}

                    {STATIC_NAV.map((item) =>
                      item.items ? (
                        <li key={item.label}>
                          <Accordion type="single" collapsible>
                            <AccordionItem
                              value={item.label}
                              className="border-0"
                            >
                              <AccordionTrigger className="px-4 h-12 text-[15px] font-medium hover:no-underline rounded-lg data-[state=closed]:hover:bg-muted/60 data-[state=open]:bg-muted">
                                {item.label}
                              </AccordionTrigger>
                              <AccordionContent className="px-1 pb-2">
                                <ul className="space-y-1">
                                  {item.items.map((child) => (
                                    <li key={child.label}>
                                      <SheetClose asChild>
                                        <Link
                                          href={child.href}
                                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
                                        >
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
                            <Link
                              href={item.href}
                              className="block rounded-lg px-4 h-12 leading-[48px] text-[15px] font-medium hover:bg-muted"
                            >
                              {item.label}
                            </Link>
                          </SheetClose>
                        </li>
                      )
                    )}
                  </ul>
                </nav>

                <div className="mt-auto border-t">
                  <div className="p-3">
                    <SheetClose asChild>
                      <Link
                        href={accountHref}
                        className="flex items-center justify-center gap-2 rounded-lg border bg-white hover:bg-muted h-11 px-4 text-sm font-medium"
                      >
                        <User className="h-5 w-5" />
                        <span>{accountLabel}</span>
                      </Link>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden lg:block">
              <Link href="/" aria-label="Go to home">
                <Image
                  src={currentLogo}
                  height={146}
                  width={383}
                  alt="KICK"
                  className="w-32"
                  priority
                />
              </Link>
            </div>
          </div>

          {/* Center */}
          <div className="flex-1 flex justify-center min-w-0">
            <Link href="/" className="lg:hidden" aria-label="Go to home">
              <Image
                src={currentLogo}
                height={146}
                width={383}
                alt="KICK"
                className="w-24"
                priority
              />
            </Link>

            <nav
              className={`hidden lg:flex items-center gap-6 relative whitespace-nowrap ${textCls}`}
            >
              {catLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`nav-link-underline text-sm font-medium tracking-wide h-10 flex items-center px-1 whitespace-nowrap ${textCls}`}
                >
                  {item.label}
                </Link>
              ))}

              {STATIC_NAV.map((item) =>
                item.items ? (
                  <div key={item.label} className="relative group">
                    <button
                      className={`nav-link-underline inline-flex items-center gap-1 text-sm font-medium tracking-wide h-10 px-1 whitespace-nowrap ${textCls}`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-500 group-hover:rotate-180 ${textCls}`}
                      />
                    </button>

                    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 mt-3 min-w-[240px] rounded-md border bg-white shadow-lg">
                      <ul className="py-2">
                        {item.items.map((child) => (
                          <li key={child.label}>
                            <Link
                              href={child.href}
                              className="block px-4 py-2.5 text-sm hover:bg-gray-50 whitespace-nowrap text-gray-900"
                            >
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

          {/* Right: icons/actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`hidden lg:inline-flex hover:bg-transparent ${textCls}`}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Button
              asChild
              variant="ghost"
              size="icon"
              className={`hidden lg:inline-flex hover:bg-transparent ${textCls}`}
            >
              <Link href={accountHref}>
                <User className="h-5 w-5" />
              </Link>
            </Button>

            {/* Cart button with animated badge (unique product count) */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-md ${textCls}`}
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />

              <AnimatePresence initial={false}>
                {uniqueCount > 0 && (
                  <motion.span
                    key="cart-badge"
                    initial={{ scale: 0.6, opacity: 0, y: -6 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.6, opacity: 0, y: -6 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    className="absolute -top-1 -right-1 grid place-items-center rounded-full bg-black text-white text-[10px] h-4 min-w-4 px-1 leading-[16px]"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={uniqueCount} // re-mount on change -> animates number
                        initial={{ y: 6, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -6, opacity: 0, scale: 0.95 }}
                        transition={{ type: "tween", duration: 0.18 }}
                      >
                        {uniqueCount > 99 ? "99+" : uniqueCount}
                      </motion.span>
                    </AnimatePresence>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {!isHome && <div style={{ height: "var(--site-header-h)" }} />}

      <CartSidebar open={cartOpen} onOpenChange={setCartOpen} />
      <SearchSidebar
        open={searchOpen}
        onOpenChange={setSearchOpen}
        products={products}
        onSelectProduct={handleSelectProduct}
        accent="#fcba17"
      />

      <style jsx global>{`
        :root {
          --primary: oklch(0.795 0.184 86.047);
        }
        .nav-link-underline {
          position: relative;
        }
        .nav-link-underline::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -2px;
          height: 2px;
          width: 0;
          background: var(--primary);
          transition: width 500ms ease;
        }
        .nav-link-underline:hover::after,
        .group:hover .nav-link-underline::after {
          width: 100%;
        }
      `}</style>
    </>
  );
}
