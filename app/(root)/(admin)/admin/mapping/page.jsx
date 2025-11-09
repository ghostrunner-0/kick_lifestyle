"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Link as LinkIcon, ChevronsUpDown, Check, Trash2, Search } from "lucide-react";

const cn = (...xs) => xs.filter(Boolean).join(" ");
const formatLabel = (parts = [], fallback = "", max = 64) => {
  const label = parts.filter(Boolean).join(" · ");
  return label ? label.slice(0, max) : fallback;
};

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ------------------------ Daraz SKU Picker (excludes mapped) ------------------------ */
function DarazSkuPicker({ value, onChange, excludeSellerSkus }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [filter, setFilter] = useState("live");

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  async function fetchPage({ reset = false } = {}) {
    try {
      if (reset) {
        setItems([]);
        setCursor(null);
        setHasMore(false);
      }
      const params = new URLSearchParams();
      params.set("filter", filter || "all");
      params.set("limit", "20");
      params.set("options", "1");
      if (dq) params.set("q", dq);
      if (!reset && cursor) params.set("update_after", cursor);

      const res = await fetch(`/api/daraz/skus?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      let newItems = json.items || [];

      // Exclude already-mapped seller_skus
      if (excludeSellerSkus && excludeSellerSkus.size) {
        newItems = newItems.filter((it) => !excludeSellerSkus.has(it.seller_sku));
      }

      const next = json?.paging?.next_update_after || null;
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      setCursor(next);
      setHasMore(Boolean(next));
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPage({ reset: true });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, filter, excludeSellerSkus]);

  async function handleLoadMore() {
    try {
      setLoadingMore(true);
      await fetchPage({ reset: false });
    } finally {
      setLoadingMore(false);
    }
  }

  const buttonLabel = value
    ? formatLabel([value.daraz_name, value.daraz_variant, value.seller_sku], value.seller_sku)
    : "Select Daraz SKU";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Daraz SKU</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            {["all","live","inactive","deleted","image-missing","pending","rejected","sold-out"].map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            <span className="truncate">{buttonLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[min(680px,92vw)]">
          <Command>
            <div className="p-2">
              <CommandInput
                placeholder="Search by Seller SKU or Name"
                value={q}
                onValueChange={setQ}
              />
            </div>
            <CommandList className="max-h-[360px]">
              {loading ? (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty>No results.</CommandEmpty>
                  <CommandGroup heading="Results">
                    {items.map((it) => {
                      const isSel = value?.seller_sku === it.seller_sku;
                      return (
                        <CommandItem
                          key={`${it.seller_sku}-${it.daraz_sku_id ?? ""}`}
                          onSelect={() => { onChange(isSel ? null : it); setOpen(false); }}
                          className="flex items-center gap-2"
                        >
                          <Check className={cn("h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{it.daraz_name || it.seller_sku || "—"}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[it.daraz_variant, it.seller_sku].filter(Boolean).join(" · ") || "—"}
                            </div>
                            <div className="flex gap-2 mt-1">
                              {it.daraz_status && <Badge variant="secondary">{it.daraz_status}</Badge>}
                              {it.daraz_sku_id != null && <Badge variant="outline">SkuId: {it.daraz_sku_id}</Badge>}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>

            <Separator />
            <div className="p-2 flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground truncate">Cursor: {cursor ? cursor : "—"}</div>
              <Button size="sm" onClick={handleLoadMore} disabled={!hasMore || loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="text-xs text-muted-foreground">
          Selected: <span className="font-medium">{value.daraz_name || value.seller_sku}</span>
          {[value.daraz_variant, value.seller_sku]
            .filter(Boolean)
            .map((part, idx) => (
              <span key={idx}> · {part}</span>
            ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Website Variant Picker (excludes mapped) ----------------------------- */
function VariantPicker({ value, onChange, excludeVariantIds }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchPage({ reset = false, pageOverride } = {}) {
    try {
      const params = new URLSearchParams();
      if (dq) params.set("q", dq);
      const targetPage = reset ? 1 : pageOverride ?? page;
      params.set("page", String(targetPage));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/catalog/variants?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setTotal(json?.paging?.total || 0);

      let newItems = json.items || [];
      // Exclude already mapped variant_ids
      if (excludeVariantIds && excludeVariantIds.size) {
        newItems = newItems.filter((it) => !excludeVariantIds.has(it.variant_id));
      }

      setItems((prev) => (reset || targetPage === 1 ? newItems : [...prev, ...newItems]));
      if (reset || targetPage === 1) {
        setPage(1);
      } else {
        setPage(targetPage);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPage({ reset: true });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, excludeVariantIds]);

  async function handleLoadMore() {
    try {
      setLoadingMore(true);
      const next = page + 1;
      await fetchPage({ reset: false, pageOverride: next });
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = items.length < total; // rough
  const buttonLabel = value
    ? formatLabel([value.product_name, value.variant_name, value.sku], value.product_name)
    : "Select website item";

  return (
    <div className="space-y-2">
      <Label>Website Variant</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            <span className="truncate">{buttonLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[min(720px,92vw)]">
          <Command>
            <div className="p-2">
              <CommandInput
                placeholder="Search product / variant / SKU / model"
                value={q}
                onValueChange={setQ}
              />
            </div>
            <CommandList className="max-h-[360px]">
              {loading ? (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty>No results.</CommandEmpty>
                  <CommandGroup heading="Results">
                    {items.map((it) => {
                      const isSel = value
                        ? value.variant_id
                          ? value.variant_id === it.variant_id
                          : !it.variant_id && value.product_id === it.product_id
                        : false;
                      const itemKey = it.variant_id ? String(it.variant_id) : `product-${it.product_id}`;
                      const secondary = [
                        it.variant_name || (!it.is_variant ? "No variant" : ""),
                        it.sku,
                        it.model_number ? `Model: ${it.model_number}` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <CommandItem
                          key={itemKey}
                          onSelect={() => { onChange(isSel ? null : it); setOpen(false); }}
                          className="flex items-center gap-2"
                        >
                          <Check className={cn("h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{it.product_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{secondary || "—"}</div>
                          </div>
                          <div className="ml-auto"><Badge variant="outline">Stock: {it.stock}</Badge></div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>

            <Separator />
            <div className="p-2 flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground">Loaded {items.length} / {total}</div>
              <Button size="sm" onClick={handleLoadMore} disabled={!hasMore || loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="text-xs text-muted-foreground">
          Selected: <span className="font-medium">{value.product_name}</span>
          {[value.variant_name || (!value.variant_id ? "No variant" : ""), value.sku]
            .filter(Boolean)
            .map((part, idx) => (
              <span key={idx}> · {part}</span>
            ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Mapping Summary (wrapped text) ----------------------------- */
function MappingSummary({ daraz, variant, saving, onSave, onClear, msg }) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LinkIcon className="h-5 w-5" /> Create Mapping
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3">
          <div className="text-sm">
            <div className="text-xs uppercase text-muted-foreground mb-1">Daraz</div>
            {daraz ? (
              <>
                <div className="font-medium break-words whitespace-normal">{daraz.daraz_name || daraz.seller_sku}</div>
                <div className="text-xs text-muted-foreground break-words whitespace-normal max-w-full">
                  {[daraz.daraz_variant, daraz.seller_sku].filter(Boolean).join(" · ") || "—"}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {daraz.daraz_status && <Badge variant="secondary">{daraz.daraz_status}</Badge>}
                  {daraz.daraz_sku_id != null && <Badge variant="outline">SkuId: {daraz.daraz_sku_id}</Badge>}
                  {daraz.daraz_item_id && <Badge variant="outline">ItemId: {daraz.daraz_item_id}</Badge>}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">Not selected</div>
            )}
          </div>

          <div className="text-sm">
            <div className="text-xs uppercase text-muted-foreground mb-1">Website</div>
            {variant ? (
              <>
                <div className="font-medium break-words whitespace-normal">{variant.product_name}</div>
                <div className="text-xs text-muted-foreground break-words whitespace-normal max-w-full">
                  {[variant.variant_name || (!variant.variant_id ? "No variant" : ""), variant.sku]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">Not selected</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={onSave} disabled={!daraz || !variant || saving} className="min-w-[120px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Mapping"}
          </Button>
          <Button variant="outline" onClick={onClear} disabled={saving}>Clear</Button>
          <div className={cn("text-sm", msg.type === "success" && "text-green-600", msg.type === "error" && "text-red-600")}>{msg.text}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- Current Mappings List (with delete) -------------------------------- */
function MappingsList({ onChanged, excludeSellerSkus, excludeVariantIds }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dq) params.set("q", dq);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/daraz/map?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setItems(json.items || []);
      setTotal(json?.paging?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dq, page]);

  async function handleDelete(seller_sku) {
    if (!seller_sku) return;
    const ok = confirm(`Delete mapping for ${seller_sku}?`);
    if (!ok) return;
    const res = await fetch(`/api/daraz/map/${encodeURIComponent(seller_sku)}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to delete");
      return;
    }
    await load();
    onChanged?.();
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Current Mappings</CardTitle>
        <div className="flex gap-2">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <Input className="pl-8" placeholder="Search mapped SKU / product / variant" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Daraz</TableHead>
                <TableHead>Website</TableHead>
                <TableHead className="w-[90px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => {
                const darazSecondary = [m.daraz_variant, m.seller_sku].filter(Boolean).join(" · ");
                const websiteSecondary = [
                  m.variant_name || (!m.variant_id ? "No variant" : ""),
                  m.variant_sku,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <TableRow key={m._id || m.seller_sku}>
                    <TableCell>
                      <div className="font-medium truncate max-w-[360px]">{m.daraz_name || m.seller_sku || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[360px]">{darazSecondary || "—"}</div>
                      <div className="flex flex-wrap gap-1 mt-2 text-[11px] text-muted-foreground">
                        {m.daraz_status && <Badge variant="secondary">{m.daraz_status}</Badge>}
                        {m.daraz_item_id && <Badge variant="outline">Item {m.daraz_item_id}</Badge>}
                        {m.daraz_sku_id && <Badge variant="outline">Sku {m.daraz_sku_id}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium truncate max-w-[360px]">{m.product_name || m.product_id}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[360px]">{websiteSecondary || "—"}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(m.seller_sku)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!items.length && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">No mappings</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between gap-2 p-3 border-t">
          <div className="text-xs text-muted-foreground">Page {page} / {maxPage}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <Button size="sm" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Page --------------------------------- */
export default function ProductMappingCompactWithList() {
  const [daraz, setDaraz] = useState(null);
  const [variant, setVariant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "idle", text: "" });

  // Exclusion sets built from current mappings
  const [excludeSellerSkus, setExcludeSellerSkus] = useState(new Set());
  const [excludeVariantIds, setExcludeVariantIds] = useState(new Set());

  async function refreshExclusions() {
    // Pull first N mappings and cache sets (you can paginate if you have many)
    const res = await fetch("/api/daraz/map?page=1&pageSize=1000");
    if (!res.ok) return;
    const json = await res.json();
    const items = json.items || [];
    setExcludeSellerSkus(new Set(items.map((m) => m.seller_sku).filter(Boolean)));
    setExcludeVariantIds(new Set(items.map((m) => m.variant_id).filter(Boolean)));
  }

  useEffect(() => { refreshExclusions(); }, []);

  async function handleSave() {
    if (!daraz || !variant) return;
    try {
      setSaving(true);
      setMsg({ type: "idle", text: "" });
      const payload = {
        seller_sku: daraz.seller_sku,
        daraz_sku_id: daraz.daraz_sku_id,
        daraz_item_id: daraz.daraz_item_id,
        daraz_status: daraz.daraz_status,
        daraz_name: daraz.daraz_name,
        daraz_variant: daraz.daraz_variant,
        product_id: variant.product_id,
        variant_id: variant.variant_id,
        product_name: variant.product_name,
        variant_name: variant.variant_name,
        variant_sku: variant.sku,
      };
      const res = await fetch("/api/daraz/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ type: "success", text: "Mapping saved." });

      // refresh exclusion sets and clear current selection (since it's now mapped)
      await refreshExclusions();
      setDaraz(null);
      setVariant(null);
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: e?.message || "Error" });
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setDaraz(null);
    setVariant(null);
    setMsg({ type: "idle", text: "" });
  }

  return (
    <div className="max-w-screen-xl mx-auto p-3 sm:p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Map Daraz SKU to Website Variant</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DarazSkuPicker value={daraz} onChange={setDaraz} excludeSellerSkus={excludeSellerSkus} />
          <VariantPicker value={variant} onChange={setVariant} excludeVariantIds={excludeVariantIds} />
        </CardContent>
      </Card>

      <MappingSummary
        daraz={daraz}
        variant={variant}
        saving={saving}
        onSave={handleSave}
        onClear={handleClear}
        msg={msg}
      />

      <MappingsList
        onChanged={async () => {
          await refreshExclusions();
          // if a selection just got deleted from mappings, it becomes eligible again automatically
        }}
      />
    </div>
  );
}
