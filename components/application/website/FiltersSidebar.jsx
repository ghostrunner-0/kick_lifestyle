// components/application/website/FiltersSidebar.jsx
"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

/* ---------- helpers ---------- */
const effPrice = (p) =>
  typeof p?.specialPrice === "number" && p.specialPrice > 0 ? p.specialPrice : p?.mrp ?? 0;

const inferInStock = (p) => {
  if (typeof p?.inStock === "boolean") return p.inStock;
  if (Number.isFinite(p?.stock)) return p.stock > 0;
  if (Number.isFinite(p?.inventory)) return p.inventory > 0;
  if (Number.isFinite(p?.quantity)) return p.quantity > 0;
  if (Array.isArray(p?.variants)) {
    return p.variants.some((v) =>
      typeof v?.inStock === "boolean" ? v.inStock : Number.isFinite(v?.stock) ? v.stock > 0 : false
    );
  }
  return true;
};

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const clampRange = (r, min, max) => {
  const a = clamp(r?.[0] ?? min, min, max);
  const b = clamp(r?.[1] ?? max, min, max);
  return a <= b ? [a, b] : [b, a];
};

// widen degenerate ranges so slider always works
const widenIfFlat = (min, max) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min < max) return [min, max];
  const pad = Math.max(1, Math.ceil(min * 0.1)); // 10% or at least 1
  return [Math.max(0, min - pad), min + pad];
};

const FiltersSidebar = forwardRef(function FiltersSidebar(
  {
    slug,                 // current category slug
    products = [],
    className = "",
    hideHeader = false,   // true when inside the Sheet
    loading = false,
    open = false,         // sheet open state (to re-init VALUES when opening)
  },
  ref
) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  /* ---------- LOCKED slider bounds (set once per category) ---------- */
  const lockedRef = useRef(false);
  const [baseMin, setBaseMin] = useState(0);
  const [baseMax, setBaseMax] = useState(1);

  // reset locks when category changes
  useEffect(() => {
    lockedRef.current = false;
    setBaseMin(0);
    setBaseMax(1);
  }, [slug]);

  // on first non-empty products list, lock bounds ONCE (don’t change later)
  useEffect(() => {
    if (lockedRef.current) return;
    if (!Array.isArray(products) || products.length === 0) return;

    const prices = products.map(effPrice).filter(Number.isFinite);
    if (prices.length === 0) {
      setBaseMin(0);
      setBaseMax(1);
      lockedRef.current = true;
      return;
    }

    let minP = Math.min(...prices);
    let maxP = Math.max(...prices);
    [minP, maxP] = widenIfFlat(minP, maxP); // keep slider usable if all prices equal

    setBaseMin(minP);
    setBaseMax(maxP);
    lockedRef.current = true;
  }, [products]);

  /* ---------- derive other facets from CURRENT products (not bounds) ---------- */
  const { warrantyOpts, canFilterInStock } = useMemo(() => {
    const present = new Set();
    for (const p of products) {
      const wm = Number(p?.warrantyMonths) || 0;
      if (wm >= 6) present.add(6);
      if (wm >= 12) present.add(12);
    }
    const warranty = [6, 12].filter((t) => present.has(t));

    const inStockCount = products.reduce(
      (acc, p) => acc + (inferInStock(p) ? 1 : 0),
      0
    );

    return { warrantyOpts: warranty, canFilterInStock: inStockCount > 0 };
  }, [products]);

  /* ---------- read URL -> local VALUES (clamped to LOCKED bounds) ---------- */
  const readFromQuery = () => {
    const min = baseMin;
    const max = baseMax;

    const priceParam = search.get("price");
    let price = [min, max];
    if (priceParam) {
      const [a, b] = priceParam.split("-").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        price = clampRange([a, b], min, max);
      }
    }

    const wRaw = search.get("warranty");
    const warranty = wRaw != null && wRaw !== "" ? Number(wRaw) : null; // 6 | 12 | null

    const stockOnly = search.get("stock") === "in";

    return { price, warranty, stockOnly };
  };

  /* ---------- local (apply-on-submit) VALUES only ---------- */
  const [localPrice, setLocalPrice] = useState([baseMin, baseMax]);
  const [localWarranty, setLocalWarranty] = useState(null);
  const [localStockOnly, setLocalStockOnly] = useState(false);

  // when sheet opens (or bounds become available), sync VALUES from URL; DO NOT change bounds
  useEffect(() => {
    if (!open) return;
    const q = readFromQuery();
    setLocalPrice(clampRange(q.price, baseMin, baseMax));
    setLocalWarranty(Number.isFinite(q.warranty) ? q.warranty : null);
    setLocalStockOnly(!!q.stockOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, baseMin, baseMax, search, slug]);

  /* ---------- expose apply() for footer button ---------- */
  useImperativeHandle(
    ref,
    () => ({
      apply: () => {
        const sp = new URLSearchParams(search.toString());

        const clamped = clampRange(localPrice, baseMin, baseMax);
        if (clamped[0] !== baseMin || clamped[1] !== baseMax) {
          sp.set("price", `${Math.round(clamped[0])}-${Math.round(clamped[1])}`);
        } else {
          sp.delete("price");
        }

        if (Number.isFinite(localWarranty)) sp.set("warranty", String(localWarranty));
        else sp.delete("warranty");

        if (localStockOnly) sp.set("stock", "in");
        else sp.delete("stock");

        if (sp.has("page")) sp.set("page", "1");
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      },
    }),
    [localPrice, localWarranty, localStockOnly, baseMin, baseMax, pathname, router, search]
  );

  /* ---------- UI ---------- */
  const sliderDisabled = baseMin >= baseMax || !Number.isFinite(baseMin) || !Number.isFinite(baseMax);

  return (
    <aside className={`space-y-4 ${className}`}>
      {!hideHeader && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Filters</h3>
          </div>
          <Separator />
        </>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-4 w-1/3 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-5/6 bg-muted rounded" />
          <div className="h-3 w-4/6 bg-muted rounded" />
        </div>
      ) : (
        <>
          {/* PRICE — always rendered; bounds are locked once and never updated */}
          <section>
            <div className="text-sm font-medium mb-2">Price</div>
            <div className="px-1 py-2">
              <Slider
                value={localPrice}
                min={baseMin}
                max={baseMax}
                step={100}
                onValueChange={(v) => setLocalPrice(clampRange(v, baseMin, baseMax))}
                disabled={sliderDisabled}
              />
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>Rs. {Math.round(localPrice[0]).toLocaleString("en-IN")}</span>
                <span>Rs. {Math.round(localPrice[1]).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </section>

          {/* WARRANTY (radio: 6/12 + Any) */}
          {warrantyOpts.length > 0 && (
            <section>
              <div className="text-sm font-medium mb-2">Warranty</div>
              <RadioGroup
                value={Number.isFinite(localWarranty) ? String(localWarranty) : "any"}
                onValueChange={(val) => {
                  const num = val === "any" ? null : Number(val);
                  setLocalWarranty(Number.isFinite(num) ? num : null);
                }}
                className="space-y-2 pt-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="w-any" value="any" />
                  <Label htmlFor="w-any" className="text-sm">Any</Label>
                </div>
                {warrantyOpts.includes(6) && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="w-6" value="6" />
                    <Label htmlFor="w-6" className="text-sm">6 months</Label>
                  </div>
                )}
                {warrantyOpts.includes(12) && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="w-12" value="12" />
                    <Label htmlFor="w-12" className="text-sm">12 months</Label>
                  </div>
                )}
              </RadioGroup>
            </section>
          )}

          {/* AVAILABILITY */}
          <section>
            <div className="text-sm font-medium mb-2">Availability</div>
            <div className="flex items-center justify-between py-1">
              <Label htmlFor="stock-only" className={`text-sm ${!canFilterInStock ? "opacity-50" : ""}`}>
                Only show in stock
              </Label>
              <Switch
                id="stock-only"
                checked={localStockOnly}
                onCheckedChange={setLocalStockOnly}
                disabled={!canFilterInStock}
              />
            </div>
            {!canFilterInStock && (
              <p className="mt-2 text-xs text-muted-foreground">No in-stock items available to filter.</p>
            )}
          </section>
        </>
      )}
    </aside>
  );
});

export default FiltersSidebar;
