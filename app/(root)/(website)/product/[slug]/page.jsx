// app/product/[slug]/page.jsx
"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import useFetch from "@/hooks/useFetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ShoppingCart } from "lucide-react";
import { CATEGORY_VIEW_ROUTE, WEBSITE_HOME } from "@/routes/WebsiteRoutes";

/* ---------------- helpers ---------------- */
const BRAND = "#fcba17";
const BRAND_HOVER = "#e9ae12";

const toNum = (v) => (typeof v === "string" ? Number(v) : v);

const formatPrice = (value) => {
  const n = toNum(value);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rs.${Number(n || 0).toLocaleString("en-IN")}`;
  }
};

const percentOff = (mrp, sp) => {
  const m = toNum(mrp);
  const s = toNum(sp);
  return Number.isFinite(m) && Number.isFinite(s) && s < m
    ? Math.round(((m - s) / m) * 100)
    : null;
};

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

/* ---------------- page ---------------- */
export default function ProductPage() {
  const { slug } = useParams();
  const router = useRouter();

  // Adjust the endpoint to your actual API route
  const { data, isLoading, isError } = useFetch(
    "product",
    slug ? `/api/website/products/get-by-slug/${slug}` : null
  );

  const product = data?.success ? data.data : null;

  // Variants
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  // Selected Variant
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const activeVariant = useMemo(
    () => (selectedIdx >= 0 ? variants[selectedIdx] : null),
    [selectedIdx, variants]
  );

  // Gallery images (variant gallery first, else product hero + media)
  const gallery = useMemo(() => {
    if (activeVariant?.productGallery?.length) {
      return activeVariant.productGallery;
    }
    const base = [];
    if (product?.heroImage?.path) base.push(product.heroImage);
    if (Array.isArray(product?.productMedia)) base.push(...product.productMedia);
    return base;
  }, [product, activeVariant]);

  const [activeImg, setActiveImg] = useState(0);

  // Price row (variant overrides once selected)
  const effMrp = toNum(activeVariant?.mrp ?? product?.mrp);
  const effSp = toNum(activeVariant?.specialPrice ?? product?.specialPrice);
  const off = percentOff(effMrp, effSp);
  const priceNow = off ? effSp : effMrp;
  const priceWas = off ? effMrp : null;

  const inStock = inferInStock(activeVariant || product);

  const onVariantClick = useCallback((idx) => {
    setSelectedIdx(idx);
    setActiveImg(0);
  }, []);

  const handleAddToCart = () => {
    const payload = {
      productId: product?._id,
      slug,
      name: product?.name,
      qty: 1,
      price: priceNow,
      mrp: effMrp,
      variant: activeVariant
        ? {
            id: activeVariant._id,
            sku: activeVariant.sku,
            name: activeVariant.variantName,
          }
        : null,
    };
    console.log("ADD_TO_CART", payload);
    // TODO: wire into your store
  };

  return (
    <main>
      {/* container */}
      <div className="mx-auto max-w-[1600px] [padding-inline:clamp(1rem,5vw,6rem)] py-6 lg:py-8">
        {/* back + breadcrumbs */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 px-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <nav className="text-xs text-muted-foreground">
            <Link href={WEBSITE_HOME} className="hover:underline">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            {product?.category?.slug ? (
              <Link
                href={CATEGORY_VIEW_ROUTE(product.category.slug)}
                className="hover:underline capitalize"
              >
                {product?.category?.name || product?.category?.slug}
              </Link>
            ) : (
              <span>Category</span>
            )}
            <span className="mx-1.5">/</span>
            <span className="text-foreground line-clamp-1">{product?.name || slug}</span>
          </nav>
        </div>

        {/* content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* left: gallery */}
          <div>
            <div className="relative w-full aspect-square rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
              {isLoading ? (
                <div className="absolute inset-0 animate-pulse bg-muted" />
              ) : gallery?.[activeImg]?.path ? (
                <Image
                  src={gallery[activeImg].path}
                  alt={gallery[activeImg]?.alt || product?.name || "Product"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                  No image
                </div>
              )}

              {/* discount */}
              {!isLoading && off !== null && (
                <div className="absolute right-3 top-3 z-10">
                  <Badge
                    variant="outline"
                    className="rounded-full bg-white text-black border border-black/10 shadow-sm px-2.5 py-1 text-[11px] font-extrabold"
                  >
                    {off}% OFF
                  </Badge>
                </div>
              )}
            </div>

            {/* thumbs */}
            <ScrollArea className="mt-3">
              <div className="flex gap-2">
                {(gallery?.length ? gallery : new Array(4).fill(null)).map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden border bg-white dark:bg-neutral-900"
                    style={{
                      outline:
                        i === activeImg ? `2px solid ${BRAND}` : "1px solid rgba(0,0,0,0.08)",
                      boxShadow:
                        i === activeImg ? `0 0 0 3px rgba(252,186,23,0.2)` : "none",
                    }}
                  >
                    {img?.path ? (
                      <Image
                        src={img.path}
                        alt={img?.alt || `thumb-${i}`}
                        fill
                        sizes="64px"
                        className="object-contain"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* right: info */}
          <div>
            {/* title */}
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {isLoading ? <span className="inline-block h-7 w-64 bg-muted animate-pulse rounded" /> : product?.name}
            </h1>

            {/* model + stock */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {product?.modelNumber && (
                <span className="text-muted-foreground">Model: {product.modelNumber}</span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  inStock ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {inStock ? "In stock" : "Out of stock"}
              </span>
              {Number(product?.warrantyMonths) > 0 && (
                <span className="text-muted-foreground">
                  Warranty: {product.warrantyMonths} months
                </span>
              )}
            </div>

            <Separator className="my-4" />

            {/* price row */}
            <div className="flex items-end gap-3">
              <div className="text-3xl font-bold leading-none">
                {isLoading ? (
                  <span className="inline-block h-8 w-32 bg-muted animate-pulse rounded" />
                ) : (
                  formatPrice(priceNow)
                )}
              </div>
              <div className="pb-1">
                {priceWas ? (
                  <span className="text-sm text-muted-foreground line-through">
                    MRP {formatPrice(priceWas)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">MRP {formatPrice(effMrp)}</span>
                )}
              </div>
            </div>

            {/* variants */}
            {variants.length > 0 && (
              <>
                <div className="mt-5 mb-2 text-sm font-medium">Choose variant</div>
                <ScrollArea>
                  <div className="flex items-center gap-2">
                    {variants.map((v, i) => {
                      const selected = i === selectedIdx;
                      const img =
                        v?.swatchImage?.path ||
                        v?.productGallery?.[0]?.path ||
                        product?.heroImage?.path;
                      return (
                        <button
                          key={v?._id || v?.sku || i}
                          type="button"
                          onClick={() => onVariantClick(i)}
                          className="relative h-10 rounded-full border bg-white dark:bg-neutral-900 flex items-center gap-2 pr-3"
                          style={{
                            borderColor: selected ? BRAND : "rgba(0,0,0,0.1)",
                            boxShadow: selected ? `0 0 0 3px rgba(252,186,23,0.2)` : "none",
                          }}
                        >
                          <span className="relative h-10 w-10 overflow-hidden rounded-full">
                            {img ? (
                              <Image
                                src={img}
                                alt={v?.variantName || "variant"}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="absolute inset-0 bg-muted" />
                            )}
                          </span>
                          <span className="text-xs sm:text-sm font-medium whitespace-nowrap pr-1">
                            {v?.variantName || "Variant"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </>
            )}

            {/* CTA */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                className="flex-1 rounded-full px-5 py-5 text-[13px] font-bold text-white"
                style={{ backgroundColor: BRAND }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND)}
                onClick={handleAddToCart}
                disabled={!inStock || isLoading || !product}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </div>

            {/* additional info */}
            {Array.isArray(product?.additionalInfo) && product.additionalInfo.length > 0 && (
              <>
                <Separator className="my-6" />
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Specifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {product.additionalInfo.map((row, idx) => (
                      <div
                        key={`${row?.label}-${idx}`}
                        className="rounded-lg border p-3 bg-white dark:bg-neutral-900"
                      >
                        <div className="text-muted-foreground">{row?.label}</div>
                        <div className="font-medium">{row?.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* description images */}
            {Array.isArray(product?.descImages) && product.descImages.length > 0 && (
              <>
                <Separator className="my-6" />
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">More images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {product.descImages.map((img, i) => (
                      <div key={img?._id || i} className="relative aspect-square rounded-md overflow-hidden border bg-white dark:bg-neutral-900">
                        {img?.path ? (
                          <Image
                            src={img.path}
                            alt={img?.alt || `desc-${i}`}
                            fill
                            sizes="(max-width: 640px) 50vw, 33vw"
                            className="object-contain"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-muted" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
