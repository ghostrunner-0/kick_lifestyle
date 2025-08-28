"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

/* routes + data */
import { CATEGORY_VIEW_ROUTE } from "@/routes/WebsiteRoutes";
import { useCategories } from "@/components/providers/CategoriesProvider";

/* shadcn/ui */
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

/* icons */
import { Store, User, ImageOff, ShieldCheck, MessageCircle } from "lucide-react";

/* helpers */
function cn(...a) {
  return a.filter(Boolean).join(" ");
}

export default function BottomNav() {
  const pathname = usePathname();
  const { categories = [] } = useCategories?.() || {};

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-50",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-t"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile Navigation"
    >
      <div className="mx-auto max-w-screen-md">
        {/* 4 items: Shop / Account / Warranty / Chat */}
        <ul className="grid grid-cols-4 text-xs">
          {/* Shop (Categories) */}
          <li>
            <Sheet>
              <SheetTrigger
                className={cn(
                  "w-full flex flex-col items-center justify-center py-2 gap-1 transition-colors",
                  pathname?.startsWith("/category")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Shop"
              >
                <Store className="h-5 w-5" />
                <span>Shop</span>
              </SheetTrigger>

              {/* Auto height up to 75vh; grows with categories */}
              <SheetContent side="bottom" className="p-0" style={{ maxHeight: "75vh", height: "auto" }}>
                <SheetHeader className="px-4 pt-4 pb-2">
                  <SheetTitle>Browse Categories</SheetTitle>
                </SheetHeader>

                {/* List naturally sizes; scrolls only if it would exceed 75vh minus header */}
                <div className="divide-y overflow-y-auto" style={{ maxHeight: "calc(75vh - 72px)" }}>
                  {categories?.length ? (
                    categories.map((c) => {
                      const img = c?.image?.path || null;
                      const alt = c?.image?.alt || c?.name || "Category";
                      return (
                        <SheetClose asChild key={c?._id || c?.slug}>
                          <Link
                            href={CATEGORY_VIEW_ROUTE(c?.slug)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3",
                              "hover:bg-muted/60 transition-colors"
                            )}
                            aria-label={c?.name || "Category"}
                          >
                            <div className="size-11 rounded-lg bg-muted shrink-0 grid place-items-center overflow-hidden">
                              {img ? (
                                <Image
                                  src={img}
                                  alt={alt}
                                  width={44}
                                  height={44}
                                  className="h-11 w-11 object-contain"
                                  sizes="44px"
                                />
                              ) : (
                                <ImageOff className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{c?.name || "Category"}</div>
                              {c?.shortDesc ? (
                                <div className="text-xs text-muted-foreground truncate">{c.shortDesc}</div>
                              ) : null}
                            </div>
                          </Link>
                        </SheetClose>
                      );
                    })
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">No categories found.</div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </li>

          {/* Account */}
          <li>
            <Link
              href="/account"
              className={cn(
                "flex flex-col items-center justify-center py-2 gap-1 transition-colors",
                isActive("/account") ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Account"
            >
              <User className="h-5 w-5" />
              <span>Account</span>
            </Link>
          </li>

          {/* Warranty */}
          <li>
            <Link
              href="/warranty"
              className={cn(
                "flex flex-col items-center justify-center py-2 gap-1 transition-colors",
                isActive("/warranty") ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Warranty"
            >
              <ShieldCheck className="h-5 w-5" />
              <span>Warranty</span>
            </Link>
          </li>

          {/* Chat (WhatsApp) */}
          <li>
            <a
              href="https://wa.me/9779820810020"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex flex-col items-center justify-center py-2 gap-1 transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Chat</span>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
