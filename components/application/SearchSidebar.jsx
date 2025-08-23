"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Fuse from "fuse.js";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search, X, Package, Tag, Barcode } from "lucide-react";

function cn(...a){ return a.filter(Boolean).join(" "); }

export default function SearchSidebar({
  products = [],
  open,
  onOpenChange,
  onSelectProduct,            // (product) => void
  placeholder = "Search products (name, SKU, category)…",
  accent = "#fcba17",
}) {
  // ⌘/Ctrl + K to open
  useEffect(() => {
    const onKey = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) { e.preventDefault(); onOpenChange?.(true); }
      if (e.key === "Escape") onOpenChange?.(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  // Normalize products to a predictable shape
  const normalized = useMemo(() => {
    return (products || []).map((p, i) => ({
      id: p.product_id || p.id || p._id || i,
      slug: p.slug || p.handle || null,
      name: p.product_name || p.name || p.title || "",
      sku: p.sku || p.model_number || p.model || "",
      category: p.category?.name || p.category_name || p.cat_name || p.category || "",
      imageUrl: p.imageUrl || p.image || p.thumbnail || p.cover || "",
      price: p.price ?? p.mrp ?? p.specialPrice ?? null,
      data: p,
    }));
  }, [products]);

  // Fuse index (rebuilds when products change)
  const fuse = useMemo(() => {
    return new Fuse(normalized, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "name", weight: 0.7 },
        { name: "sku", weight: 0.2 },
        { name: "category", weight: 0.1 },
      ],
    });
  }, [normalized]);

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
    else setQuery("");
  }, [open]);

  const allList = useMemo(() => {
    // Default list when no query: show first 30 alphabetically
    return [...normalized].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 30);
  }, [normalized]);

  const results = useMemo(() => {
    if (!query.trim()) return allList;
    return fuse.search(query.trim()).slice(0, 40).map(r => r.item);
  }, [query, fuse, allList]);

  useEffect(() => setActiveIdx(0), [query]);

  const highlight = (text, q) => {
    if (!q) return text;
    const i = (text || "").toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="rounded px-0.5" style={{ background: `${accent}33` }}>
          {text.slice(i, i + q.length)}
        </mark>
        {text.slice(i + q.length)}
      </>
    );
  };

  const handleKey = useCallback((e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIdx];
      if (item) {
        onSelectProduct?.(item.data ?? item);
        onOpenChange?.(false);
      }
    }
  }, [results, activeIdx, onSelectProduct, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:w-[480px] w-full">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Search
          </SheetTitle>
        </SheetHeader>

        {/* Search input lives INSIDE the sidebar */}
        <div className="p-4 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder={placeholder}
              className="pl-9 pr-9"
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setQuery("")}
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <Separator />

        {/* Results */}
        <div className="h-[calc(100dvh-160px)] overflow-auto">
          <ul role="listbox" className="p-2">
            {results.length === 0 ? (
              <li className="py-10 text-center text-sm text-muted-foreground">
                No products found.
              </li>
            ) : (
              results.map((p, idx) => (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={idx === activeIdx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => { onSelectProduct?.(p.data ?? p); onOpenChange?.(false); }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-3 cursor-pointer",
                    idx === activeIdx ? "bg-muted/60" : "hover:bg-muted/40"
                  )}
                >
                  {/* thumbnail */}
                  <div className="h-10 w-10 flex items-center justify-center rounded-md bg-muted overflow-hidden">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {highlight(p.name || "", query)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {p.sku ? (
                        <span className="inline-flex items-center gap-1">
                          <Barcode className="h-3 w-3" /> {highlight(String(p.sku), query)}
                        </span>
                      ) : null}
                      {p.category ? (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {p.category}
                        </span>
                      ) : null}
                      {p.price != null ? (
                        <span className="ml-auto font-medium">NPR {Number(p.price).toLocaleString()}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>Press <kbd className="px-1 py-0.5 border rounded">Enter</kbd> to select</span>
          <span className="hidden sm:block">Open with <kbd className="px-1 py-0.5 border rounded">⌘/Ctrl</kbd>+<kbd className="px-1 py-0.5 border rounded">K</kbd></span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
