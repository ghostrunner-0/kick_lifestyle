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
import { ScrollArea } from "@/components/ui/scroll-area";

/* icons */
import { Home, Grid3X3, User, ImageOff } from "lucide-react";

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

  // Drawer sizing: header + 2 rows
  const HEADER_H = 64; // px (Sheet header approx)
  const ROW_H = 64;    // px (row height ~ py-3, icon etc.)
  const rows = Math.min(categories?.length || 0, 2) || 2; // show space for 2 even if <2
  const sheetHeight = HEADER_H + rows * ROW_H;
  const listHeight = rows * ROW_H;

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
        {/* 3 items: Home / Browse / Account */}
        <ul className="grid grid-cols-3 text-xs">
          {/* Home */}
          <li>
            <Link
              href="/"
              className={cn(
                "flex flex-col items-center justify-center py-2 gap-1 transition-colors",
                isActive("/") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Home"
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
          </li>

          {/* Browse (Categories) */}
          <li>
            <Sheet>
              <SheetTrigger
                className={cn(
                  "w-full flex flex-col items-center justify-center py-2 gap-1",
                  "text-muted-foreground hover:text-foreground transition-colors"
                )}
                aria-label="Browse Categories"
              >
                <Grid3X3 className="h-5 w-5" />
                <span>Browse</span>
              </SheetTrigger>

              <SheetContent
                side="bottom"
                className="p-0"
                style={{ height: `${sheetHeight}px` }}
              >
                <SheetHeader className="px-4 pt-4 pb-2">
                  <SheetTitle>Browse Categories</SheetTitle>
                </SheetHeader>

                {/* List area = exactly 2 rows tall; scrolls if more */}
                <ScrollArea style={{ height: `${listHeight}px` }}>
                  <div className="divide-y">
                    {categories?.length ? (
                      categories.map((c) => {
                        const img = c?.image?.path || null;
                        const alt = c?.image?.alt || c?.name || "Category";
                        return (
                          <SheetClose asChild key={c?._id || c?.slug}>
                            <Link
                              href={CATEGORY_VIEW_ROUTE(c?.slug)}
                              className={cn(
                                "flex items-center gap-3 px-4",
                                "hover:bg-muted/60 transition-colors",
                                "min-h-16" // 64px = ROW_H
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
                                <div className="font-medium truncate">
                                  {c?.name || "Category"}
                                </div>
                                {c?.shortDesc ? (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {c.shortDesc}
                                  </div>
                                ) : null}
                              </div>
                            </Link>
                          </SheetClose>
                        );
                      })
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        No categories found.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </li>

          {/* Account */}
          <li>
            <Link
              href="/account"
              className={cn(
                "flex flex-col items-center justify-center py-2 gap-1",
                isActive("/account")
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Account"
            >
              <User className="h-5 w-5" />
              <span>Account</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
