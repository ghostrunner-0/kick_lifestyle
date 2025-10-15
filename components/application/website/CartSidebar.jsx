"use client";
import React, { useMemo, useEffect } from "react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import {
  selectItems,
  selectSubtotal,
  setQty,
  removeItem,
  selectRepricing,
  repriceCart,
} from "@/store/cartSlice";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const formatNpr = (v) => {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rs. ${n.toLocaleString("en-IN")}`;
  }
};

export default function CartSidebar({ open, onOpenChange }) {
  const dispatch = useDispatch();
  const items = useSelector(selectItems) || [];
  const subtotal = useSelector(selectSubtotal) || 0;
  const repricing = useSelector(selectRepricing);

  const itemCount = useMemo(
    () => items.reduce((n, it) => n + (Number(it.qty) || 0), 0),
    [items]
  );

  useEffect(() => {
    if (open) dispatch(repriceCart());
  }, [open, dispatch]);

  const lineItems = useMemo(
    () =>
      items.map((it) => {
        const key = `${it.productId}|${it.variant?.id || ""}`;
        const title = it.variant ? `${it.name} — ${it.variant.name}` : it.name;
        const isFree = !!it.isFreeItem;
        const lineTotal = isFree
          ? 0
          : (Number(it.price) || 0) * (Number(it.qty) || 0);
        const img = it.image || it.variant?.image || "/placeholder.png";
        return { key, title, lineTotal, img, it, isFree };
      }),
    [items]
  );

  const dec = (it) =>
    dispatch(
      setQty({
        productId: it.productId,
        variant: it.variant,
        qty: Math.max(0, (it.qty || 0) - 1),
      })
    );
  const inc = (it) =>
    dispatch(
      setQty({
        productId: it.productId,
        variant: it.variant,
        qty: (it.qty || 0) + 1,
      })
    );
  const del = (it) =>
    dispatch(removeItem({ productId: it.productId, variant: it.variant }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[92vw] sm:w-[440px] p-0 flex flex-col h-dvh max-h-dvh"
      >
        {/* Required for Radix a11y: keep title, hide visually */}
        <SheetHeader className="sr-only">
          <SheetTitle>Shopping cart</SheetTitle>
        </SheetHeader>

        {/* Header */}
        <div className="border-b px-4 py-4 shrink-0 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-sm">
                  <ShoppingCart
                    className="h-5 w-5 text-slate-900"
                    aria-hidden="true"
                  />
                </span>
                <span className="sr-only">Cart</span>
              </div>

              <p className="text-xs text-muted-foreground">
                {repricing
                  ? "Refreshing prices & stock…"
                  : `${itemCount} item${itemCount === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <ShoppingCart
                  className="h-8 w-8 text-slate-600"
                  aria-hidden="true"
                />
              </span>
              <div className="text-sm font-medium text-slate-900">
                Your cart is empty
              </div>
              <div className="text-xs text-muted-foreground">
                Add items to see them here
              </div>
            </div>
          ) : (
            <ul className="divide-y rounded-xl border bg-white">
              {lineItems.map(({ key, title, lineTotal, img, it }) => (
                <li key={key} className="flex gap-3 p-3 sm:p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white">
                    <Image
                      src={img}
                      alt={title}
                      fill
                      sizes="64px"
                      className="object-contain"
                      priority={false}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-medium text-slate-900">
                          {title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span>
                            {it.isFreeItem ? formatNpr(0) : formatNpr(it.price)}
                          </span>
                          {!it.isFreeItem &&
                            Number(it.mrp) > Number(it.price) && (
                              <span className="line-through text-slate-400">
                                MRP {formatNpr(it.mrp)}
                              </span>
                            )}
                          {it?.flags?.capped && (
                            <span className="text-amber-600">(qty capped)</span>
                          )}
                          {it?.flags?.outOfStock && (
                            <span className="text-red-600">(out of stock)</span>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500"
                        onClick={() => del(it)}
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border bg-white">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => dec(it)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-9 text-center text-sm font-medium tabular-nums">
                          {it.qty}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => inc(it)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="text-sm font-semibold">
                        {it.isFreeItem ? formatNpr(0) : formatNpr(lineTotal)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 pb-4 pt-2 bg-white/80 backdrop-blur border-t">
          {repricing ? (
            <Button
              className="mt-0 w-full h-11 rounded-xl text-[14px] font-semibold"
              disabled
            >
              Updating…
            </Button>
          ) : items.length > 0 ? (
            <Button
              asChild
              className="mt-0 w-full h-11 rounded-xl text-[14px] font-semibold"
              aria-label={`Go to checkout — ${formatNpr(subtotal)}`}
            >
              <Link
                href="/checkout"
                onClick={() => {
                  try {
                    onOpenChange?.(false);
                  } catch {}
                }}
              >
                {`Checkout — ${formatNpr(subtotal)}`}
              </Link>
            </Button>
          ) : (
            <div className="h-3" />
          )}
          <div className="pt-[env(safe-area-inset-bottom)]" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
