"use client";

import React, { useEffect, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Loader2,
  Link as LinkIcon,
  ChevronsUpDown,
  Check,
  Trash2,
  Search,
} from "lucide-react";

const cn = (...xs) => xs.filter(Boolean).join(" ");

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* -------------------------------------------------------------------------- */
/*                               DarazSkuPicker                               */
/* -------------------------------------------------------------------------- */
/**
 * Expects /api/daraz/skus to return:
 * {
 *   seller_sku,
 *   daraz_sku_id,
 *   daraz_item_id,
 *   daraz_status,
 *   daraz_product_name?,  // mapped from attributes.name
 *   daraz_variant_name?,  // built from options OR sku label
 *   ...
 * }
 */
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

      // Exclude already-mapped SKUs
      if (excludeSellerSkus && excludeSellerSkus.size) {
        newItems = newItems.filter(
          (it) => !excludeSellerSkus.has(it.seller_sku)
        );
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

  const buttonLabel = useMemo(() => {
    if (!value) return "Select Daraz Product";
    const p =
      value.daraz_product_name ||
      value.productTitle ||
      value.daraz_name ||
      "Untitled Daraz Product";
    const v = value.daraz_variant_name || "";
    return `${p}${v ? " · " + v : ""}`.slice(0, 64);
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Daraz Product</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            {[
              "all",
              "live",
              "inactive",
              "deleted",
              "image-missing",
              "pending",
              "rejected",
              "sold-out",
            ].map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
          >
            <span className="truncate">{buttonLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[min(680px,92vw)]">
          <Command>
            <div className="p-2">
              <CommandInput
                placeholder="Search Daraz product / variant / seller SKU"
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
                      const productTitle =
                        it.daraz_product_name ||
                        it.attributes?.name ||
                        it.name ||
                        it.product_name ||
                        it.daraz_name ||
                        "Untitled Daraz Product";

                      const variantLabel =
                        it.daraz_variant_name ||
                        it.variant_name ||
                        it.SkuName ||
                        it.SkuTitle ||
                        it.SellerSku ||
                        it.seller_sku ||
                        "";

                      const isSel =
                        value?.seller_sku === it.seller_sku &&
                        (value?.daraz_sku_id || "") ===
                          (it.daraz_sku_id || it.SkuId || "");

                      return (
                        <CommandItem
                          key={`${it.seller_sku}-${
                            it.daraz_sku_id || it.SkuId || ""
                          }-${it.daraz_item_id || it.item_id || ""}`}
                          onSelect={() => {
                            onChange(
                              isSel
                                ? null
                                : {
                                    ...it,
                                    daraz_product_name: productTitle,
                                    daraz_variant_name: variantLabel,
                                  }
                            );
                            setOpen(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              isSel ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {productTitle}
                            </div>
                            {variantLabel && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {variantLabel}
                              </div>
                            )}
                            <div className="text-[10px] text-muted-foreground truncate">
                              {it.seller_sku || ""}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {it.daraz_status && (
                                <Badge variant="secondary">
                                  {it.daraz_status}
                                </Badge>
                              )}
                              {(it.daraz_item_id || it.item_id) && (
                                <Badge variant="outline">
                                  ItemId: {it.daraz_item_id || it.item_id}
                                </Badge>
                              )}
                              {(it.daraz_sku_id || it.SkuId) && (
                                <Badge variant="outline">
                                  SkuId: {it.daraz_sku_id || it.SkuId}
                                </Badge>
                              )}
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
              <div className="text-[10px] text-muted-foreground truncate">
                Cursor: {cursor || "—"}
              </div>
              <Button
                size="sm"
                onClick={handleLoadMore}
                disabled={!hasMore || loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <div>
            Daraz:{" "}
            <span className="font-medium">
              {value.daraz_product_name ||
                value.productTitle ||
                "Untitled Daraz Product"}
            </span>
          </div>
          {value.daraz_variant_name && (
            <div>Variant: {value.daraz_variant_name}</div>
          )}
          {value.seller_sku && (
            <div className="text-[10px]">Seller SKU: {value.seller_sku}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           WebsiteTargetPicker                              */
/* -------------------------------------------------------------------------- */
/**
 * Expects /api/catalog/variants to return:
 * {
 *   items: [
 *     {
 *       product_id,
 *       product_name,
 *       variant_id,
 *       variant_name,
 *       sku,
 *       model_number,
 *       stock,
 *     }
 *   ]
 * }
 */
function WebsiteTargetPicker({ value, onChange, excludeVariantIds }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchPage({ reset = false } = {}) {
    try {
      const params = new URLSearchParams();
      if (dq) params.set("q", dq);
      params.set("page", String(reset ? 1 : page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/catalog/variants?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();

      setTotal(json?.paging?.total || 0);

      let newItems = json.items || [];

      if (excludeVariantIds && excludeVariantIds.size) {
        newItems = newItems.filter(
          (it) => !excludeVariantIds.has(it.variant_id)
        );
      }

      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPage({ reset: true });
      setPage(1);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, excludeVariantIds]);

  async function handleLoadMore() {
    try {
      setLoadingMore(true);
      const next = page + 1;
      setPage(next);
      await fetchPage({ reset: false });
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = items.length < total;

  const options = useMemo(() => {
    const productMap = new Map();

    items.forEach((it) => {
      if (it.product_id && !productMap.has(it.product_id)) {
        productMap.set(it.product_id, {
          type: "product",
          product_id: it.product_id,
          product_name: it.product_name || "Unnamed Product",
        });
      }
    });

    const productOptions = Array.from(productMap.values());

    const variantOptions = items
      .filter((it) => it.variant_id)
      .map((it) => ({
        type: "variant",
        product_id: it.product_id,
        product_name: it.product_name || "Unnamed Product",
        variant_id: it.variant_id,
        variant_name: it.variant_name || "Variant",
        sku: it.sku,
        model_number: it.model_number,
        stock: it.stock,
      }));

    return [...productOptions, ...variantOptions];
  }, [items]);

  const buttonLabel = useMemo(() => {
    if (!value) return "Select website product / variant";
    if (value.type === "product") {
      return `${value.product_name}`.slice(0, 64);
    }
    return `${value.product_name} · ${value.variant_name}`.slice(0, 64);
  }, [value]);

  return (
    <div className="space-y-2">
      <Label>Website Target</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
          >
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

                  <CommandGroup heading="Products (no specific variant)">
                    {options
                      .filter((o) => o.type === "product")
                      .map((o) => {
                        const isSel =
                          value?.type === "product" &&
                          value?.product_id === o.product_id;
                        return (
                          <CommandItem
                            key={`p-${o.product_id}`}
                            onSelect={() => {
                              onChange(isSel ? null : o);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4 mr-1",
                                isSel ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {o.product_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Product-level mapping
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                  </CommandGroup>

                  <CommandGroup heading="Variants">
                    {options
                      .filter((o) => o.type === "variant")
                      .map((o) => {
                        const isSel =
                          value?.type === "variant" &&
                          value?.variant_id === o.variant_id;
                        return (
                          <CommandItem
                            key={`v-${o.variant_id}`}
                            onSelect={() => {
                              onChange(isSel ? null : o);
                              setOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                isSel ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {o.product_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {o.variant_name}
                                {o.sku ? ` · ${o.sku}` : ""}
                                {o.model_number ? ` · ${o.model_number}` : ""}
                              </div>
                            </div>
                            <div className="ml-auto">
                              <Badge variant="outline">Stock: {o.stock}</Badge>
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
              <div className="text-[11px] text-muted-foreground">
                Loaded {items.length} / {total}
              </div>
              <Button
                size="sm"
                onClick={handleLoadMore}
                disabled={!hasMore || loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="text-xs text-muted-foreground">
          Selected:&nbsp;
          {value.type === "product" ? (
            <span className="font-medium">{value.product_name}</span>
          ) : (
            <>
              <span className="font-medium">{value.product_name}</span>
              {" · "}
              {value.variant_name}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MappingSummary                                */
/* -------------------------------------------------------------------------- */

function MappingSummary({ daraz, target, saving, onSave, onClear, msg }) {
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
          {/* Daraz */}
          <div className="text-sm">
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Daraz
            </div>
            {daraz ? (
              <>
                <div className="font-medium break-words whitespace-normal">
                  {daraz.daraz_product_name ||
                    daraz.productTitle ||
                    "Untitled Daraz Product"}
                </div>
                {daraz.daraz_variant_name && (
                  <div className="text-xs text-muted-foreground break-words whitespace-normal">
                    {daraz.daraz_variant_name}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground">
                  {daraz.seller_sku || "—"}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {daraz.daraz_status && (
                    <Badge variant="secondary">{daraz.daraz_status}</Badge>
                  )}
                  {(daraz.daraz_item_id || daraz.item_id) && (
                    <Badge variant="outline">
                      ItemId: {daraz.daraz_item_id || daraz.item_id}
                    </Badge>
                  )}
                  {(daraz.daraz_sku_id || daraz.SkuId) && (
                    <Badge variant="outline">
                      SkuId: {daraz.daraz_sku_id || daraz.SkuId}
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">Not selected</div>
            )}
          </div>

          {/* Website */}
          <div className="text-sm">
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Website
            </div>
            {target ? (
              <>
                <div className="font-medium break-words whitespace-normal">
                  {target.product_name}
                </div>
                {target.type === "variant" && (
                  <div className="text-xs text-muted-foreground break-words whitespace-normal">
                    {target.variant_name}
                  </div>
                )}
                {target.type === "product" && (
                  <div className="text-[10px] text-muted-foreground">
                    Product-level mapping
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">Not selected</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={onSave}
            disabled={!daraz || !target || saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Mapping"
            )}
          </Button>
          <Button variant="outline" onClick={onClear} disabled={saving}>
            Clear
          </Button>
          <div
            className={cn(
              "text-sm",
              msg.type === "success" && "text-green-600",
              msg.type === "error" && "text-red-600"
            )}
          >
            {msg.text}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MappingsList                                 */
/* -------------------------------------------------------------------------- */

function MappingsList({ onChanged }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load(p = page, query = dq) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("page", String(p));
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

  useEffect(() => {
    load(1, dq);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  useEffect(() => {
    load(page, dq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleDelete(seller_sku) {
    if (!seller_sku) return;
    const ok = confirm(`Delete mapping for ${seller_sku}?`);
    if (!ok) return;

    const res = await fetch(
      `/api/daraz/map/${encodeURIComponent(seller_sku)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      alert("Failed to delete");
      return;
    }

    await load(1, dq);
    setPage(1);
    onChanged?.();
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader className="py-3 space-y-2">
        <CardTitle className="text-base">Current Mappings</CardTitle>
        <div className="flex gap-2">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <Input
              className="pl-8"
              placeholder="Search Daraz / website (names, variants, SKUs)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
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
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => (
                <TableRow
                  key={m._id || `${m.seller_sku}-${m.daraz_item_id || ""}`}
                >
                  <TableCell>
                    <div className="font-medium truncate max-w-[260px]">
                      {m.daraz_product_name || "Untitled Daraz Product"}
                    </div>
                    {m.daraz_variant_name && (
                      <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                        {m.daraz_variant_name}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground truncate max-w-[260px]">
                      {m.seller_sku || "—"}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1 text-[9px] text-muted-foreground">
                      {m.daraz_status && (
                        <Badge variant="secondary">{m.daraz_status}</Badge>
                      )}
                      {m.daraz_item_id && (
                        <Badge variant="outline">
                          ItemId: {m.daraz_item_id}
                        </Badge>
                      )}
                      {m.daraz_sku_id && (
                        <Badge variant="outline">SkuId: {m.daraz_sku_id}</Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium truncate max-w-[260px]">
                      {m.product_name || m.product_id || "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                      {m.variant_id
                        ? m.variant_name || "Variant"
                        : "Product-level mapping"}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(m.seller_sku)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!items.length && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-10 text-sm text-muted-foreground"
                  >
                    No mappings
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 border-t">
          <div className="text-xs text-muted-foreground">
            Page {page} / {maxPage}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function ProductMappingCompactWithList() {
  const [daraz, setDaraz] = useState(null);
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "idle", text: "" });

  const [excludeSellerSkus, setExcludeSellerSkus] = useState(new Set());
  const [excludeVariantIds, setExcludeVariantIds] = useState(new Set());

  async function refreshExclusions() {
    try {
      const res = await fetch("/api/daraz/map?page=1&pageSize=1000");
      if (!res.ok) return;
      const json = await res.json();
      const items = json.items || [];

      setExcludeSellerSkus(
        new Set(items.map((m) => m.seller_sku).filter(Boolean))
      );
      setExcludeVariantIds(
        new Set(items.map((m) => m.variant_id).filter(Boolean))
      );
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    refreshExclusions();
  }, []);

  async function handleSave() {
    if (!daraz || !target) return;

    try {
      setSaving(true);
      setMsg({ type: "idle", text: "" });

      const payload = {
        seller_sku: daraz.seller_sku,
        daraz_sku_id: daraz.daraz_sku_id || daraz.SkuId,
        daraz_item_id: daraz.daraz_item_id || daraz.item_id,
        daraz_status: daraz.daraz_status || daraz.Status,
        daraz_product_name:
          daraz.daraz_product_name ||
          daraz.productTitle ||
          daraz.attributes?.name ||
          daraz.name,
        daraz_variant_name:
          daraz.daraz_variant_name ||
          daraz.variant_name ||
          daraz.SellerSku ||
          daraz.seller_sku,

        product_id: target.product_id,
        product_name: target.product_name,
        variant_id: target.type === "variant" ? target.variant_id : null,
        variant_name: target.type === "variant" ? target.variant_name : "",
      };

      const res = await fetch("/api/daraz/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      setMsg({ type: "success", text: "Mapping saved." });
      await refreshExclusions();
      setDaraz(null);
      setTarget(null);
    } catch (e) {
      console.error(e);
      setMsg({
        type: "error",
        text: e?.message || "Error saving mapping",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setDaraz(null);
    setTarget(null);
    setMsg({ type: "idle", text: "" });
  }

  return (
    <div className="max-w-screen-xl mx-auto p-3 sm:p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Map Daraz Product & Variant to Website
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DarazSkuPicker
            value={daraz}
            onChange={setDaraz}
            excludeSellerSkus={excludeSellerSkus}
          />
          <WebsiteTargetPicker
            value={target}
            onChange={setTarget}
            excludeVariantIds={excludeVariantIds}
          />
        </CardContent>
      </Card>

      <MappingSummary
        daraz={daraz}
        target={target}
        saving={saving}
        onSave={handleSave}
        onClear={handleClear}
        msg={msg}
      />

      <MappingsList
        onChanged={async () => {
          await refreshExclusions();
        }}
      />
    </div>
  );
}
