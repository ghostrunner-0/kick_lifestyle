"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";

/* store */
import {
  addItem,
  setQty,
  removeItem,
  selectItemsMap,
} from "@/store/cartSlice";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";

/* icons */
import { ShoppingCart, Star } from "lucide-react";

/* --- helpers --- */
const api = axios.create({ baseURL: "/", withCredentials: true });

const toNum = (v) => (typeof v === "string" ? Number(v) : v);
const money = (n) => {
  const v = toNum(n);
  if (!Number.isFinite(v)) return "";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `Rs. ${Number(v || 0).toLocaleString("en-IN")}`;
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
      typeof v?.inStock === "boolean"
        ? v.inStock
        : Number.isFinite(v?.stock)
        ? v.stock > 0
        : false
    );
  }
  return true;
};
const getVariantHero = (v, fallback) =>
  v?.heroImage?.path ||
  v?.productGallery?.[0]?.path ||
  v?.swatchImage?.path ||
  fallback ||
  "";

/* stars */
function Stars({ value = 0, size = 16, className = "" }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className={`inline-flex items-center ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full;
        const showHalf = !filled && i === full && half;
        return (
          <Star
            key={i}
            size={size}
            className={`mr-1 ${
              filled
                ? "fill-yellow-400 stroke-yellow-400"
                : showHalf
                ? "fill-yellow-400/60 stroke-yellow-400/60"
                : "stroke-muted-foreground"
            }`}
          />
        );
      })}
    </div>
  );
}
const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

/* Qty control used in card + sticky */
const QtyControl = ({
  qty = 0,
  onDec,
  onInc,
  size = "md", // "sm" (sticky) | "md" (main)
  className = "",
}) => {
  const h = size === "sm" ? "h-9" : "h-12";
  const cols =
    size === "sm"
      ? "grid-cols-[38px_1fr_38px]"
      : "grid-cols-[48px_1fr_48px]";
  return (
    <div
      className={`grid ${cols} w-full rounded-xl border bg-background overflow-visible ${className}`}
    >
      <button
        type="button"
        className={`${h} grid place-items-center text-lg font-semibold`}
        onClick={onDec}
        aria-label="Decrease quantity"
      >
        –
      </button>
      <div
        className={`${h} grid place-items-center text-base font-medium select-none tabular-nums`}
      >
        {qty}
      </div>
      <button
        type="button"
        className={`${h} grid place-items-center text-lg font-semibold`}
        onClick={onInc}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
};

/* ===================== ReviewsTab ===================== */
function ReviewsTab({ productId }) {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [sort, setSort] = useState("newest");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [isLoadingList, setIsLoadingList] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!productId) return;
    try {
      const { data } = await api.get("/api/website/reviews/summary", {
        params: { productId },
      });
      if (data?.success) setSummary(data.data);
    } catch {}
  }, [productId]);

  const loadPage = useCallback(
    async (reset = false) => {
      if (!productId) return;
      setIsLoadingList(true);
      try {
        const params = {
          productId,
          page: String(reset ? 1 : page),
          limit: String(pageSize),
          sort,
        };
        if (ratingFilter !== "all") params.rating = ratingFilter;

        const { data } = await api.get("/api/website/reviews", { params });
        if (data?.success) {
          setTotal(data.data.total || 0);
          if (reset) setItems(data.data.items || []);
          else setItems((prev) => [...prev, ...(data.data.items || [])]);
          if (reset) setPage(1);
        }
      } finally {
        setIsLoadingList(false);
      }
    },
    [productId, page, pageSize, sort, ratingFilter]
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    setPage(1);
    loadPage(true);
  }, [sort, ratingFilter]); // eslint-disable-line

  const hasMore = items.length < total;

  /* write review */
  const [open, setOpen] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitReview = async () => {
    if (!productId || !formTitle.trim() || !formBody.trim() || !formRating)
      return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/website/reviews", {
        product: productId,
        rating: Number(formRating),
        title: formTitle.trim(),
        review: formBody.trim(),
      });
      if (data?.success) {
        setOpen(false);
        setFormRating(5);
        setFormTitle("");
        setFormBody("");
        await loadSummary(); // appears after moderation
      }
    } catch (err) {
      if (err?.response?.status === 401)
        alert("Please login to write a review.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = summary?.total || 0;
  const avg = summary?.average || 0;
  const buckets = summary?.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <div className="rounded-2xl border p-5 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Average rating</div>
          <div className="mt-1 flex items-end gap-2">
            <div className="text-4xl font-semibold">{avg.toFixed(1)}</div>
            <Stars value={avg} size={18} />
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {totalCount} review{totalCount === 1 ? "" : "s"}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <Button className="mt-4 w-full rounded-full" onClick={() => setOpen(true)}>
              Write a review
            </Button>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Write a review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <div className="text-sm font-medium mb-1.5">Your rating</div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFormRating(n)}
                        aria-label={`${n} star`}
                        className="p-1"
                      >
                        <Star
                          className={`${
                            n <= formRating
                              ? "fill-yellow-400 stroke-yellow-400"
                              : "stroke-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      {formRating} / 5
                    </span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Great value and build quality"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Your review</label>
                  <Textarea
                    rows={5}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="What did you like? Any downsides?"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your review will appear after moderation.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitReview}
                  disabled={submitting || !formTitle.trim() || !formBody.trim()}
                >
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="md:col-span-8 rounded-xl border p-4">
          <div className="text-sm font-medium mb-3">Rating breakdown</div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = buckets?.[star] || 0;
              const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="w-10 text-xs tabular-nums">{star}★</div>
                  <Progress value={pct} className="h-2 flex-1" />
                  <div className="w-12 text-right text-xs text-muted-foreground">
                    {pct}%
                  </div>
                  <div className="w-10 text-right text-xs text-muted-foreground">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-muted-foreground">
          {total} review{total === 1 ? "" : "s"}
        </div>
        <Select value={ratingFilter} onValueChange={(v) => setRatingFilter(v)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            <SelectItem value="5">5 stars</SelectItem>
            <SelectItem value="4">4 stars</SelectItem>
            <SelectItem value="3">3 stars</SelectItem>
            <SelectItem value="2">2 stars</SelectItem>
            <SelectItem value="1">1 star</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Newest" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="highest">Highest rated</SelectItem>
            <SelectItem value="lowest">Lowest rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* list */}
      <div className="space-y-4">
        {items.map((r) => (
          <div key={r._id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-sm font-medium">{r.title}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtDate(r.createdAt)} • {r.userName || "Verified buyer"}
                </div>
              </div>
            </div>
            <p className="text-sm mt-3 leading-6">{r.review}</p>
          </div>
        ))}

        {isLoadingList && items.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading reviews…</div>
        )}
        {!isLoadingList && items.length === 0 && (
          <div className="text-sm text-muted-foreground">No reviews yet.</div>
        )}

        {hasMore && (
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={isLoadingList}
              onClick={() => {
                setPage((p) => p + 1);
                loadPage(false);
              }}
            >
              {isLoadingList ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== Product Page ===================== */
export default function ProductPageClient({ initialProduct }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const product = initialProduct || null;
  const slug = product?.slug || product?.data?.slug || "";

  // rating summary for quick display in header/card
  const [ratingSummary, setRatingSummary] = useState({
    average: 0,
    total: 0,
    loaded: false,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!product?._id) return;
      try {
        const { data } = await api.get("/api/website/reviews/summary", {
          params: { productId: product._id },
        });
        if (!cancelled && data?.success) {
          const avg = Number(data.data?.average || 0);
          const total = Number(data.data?.total || 0);
          setRatingSummary({ average: avg, total, loaded: true });
        }
      } catch {
        if (!cancelled) setRatingSummary((s) => ({ ...s, loaded: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product?._id]);

  // variants & pricing
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const [selectedIdx, setSelectedIdx] = useState(
    variants.length > 0 ? 0 : -1
  );
  useEffect(() => {
    if (variants.length > 0 && (selectedIdx < 0 || selectedIdx >= variants.length)) {
      setSelectedIdx(0);
    }
  }, [variants, selectedIdx]);
  const activeVariant = useMemo(
    () => (selectedIdx >= 0 ? variants[selectedIdx] : null),
    [selectedIdx, variants]
  );

  const gallery = useMemo(() => {
    if (activeVariant?.productGallery?.length)
      return activeVariant.productGallery;
    const base = [];
    if (product?.heroImage?.path) base.push(product.heroImage);
    if (Array.isArray(product?.productMedia)) base.push(...product.productMedia);
    return base;
  }, [product, activeVariant]);

  const heroSrc =
    product?.heroImage?.path ||
    gallery?.[0]?.path ||
    activeVariant?.productGallery?.[0]?.path ||
    "";

  const effMrp = toNum(activeVariant?.mrp ?? product?.mrp);
  const effSp = toNum(activeVariant?.specialPrice ?? product?.specialPrice);
  const offPct = percentOff(effMrp, effSp);
  const priceNow = offPct ? effSp : effMrp;
  const priceWas = offPct ? effMrp : null;
  const inStock = inferInStock(activeVariant || product);

  // cart
  const itemsMap = useSelector(selectItemsMap) || {};
  const lineKey = `${product?._id || ""}|${activeVariant?._id || ""}`;
  const inCartLine = itemsMap[lineKey];
  const qtyNow = inCartLine?.qty || 0;

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const primaryImage = heroSrc || gallery?.[0]?.path || undefined;
    dispatch(
      addItem({
        productId: product?._id,
        slug,
        name: product?.name,
        qty: 1,
        price: priceNow,
        mrp: effMrp,
        image: primaryImage,
        variant: activeVariant
          ? {
              id: activeVariant._id,
              sku: activeVariant.sku,
              name: activeVariant.variantName,
              image:
                activeVariant.productGallery?.[0]?.path ||
                activeVariant.swatchImage?.path ||
                undefined,
            }
          : null,
      })
    );
  }, [dispatch, product, activeVariant, priceNow, effMrp, heroSrc, gallery, slug]);

  // sticky bars
  const [headerOffset, setHeaderOffset] = useState(0);
  useEffect(() => {
    const measure = () => {
      const hdr = document.querySelector("header");
      setHeaderOffset(hdr ? hdr.getBoundingClientRect().height + 8 : 8);
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, []);

  const galleryRef = useRef(null);
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: `-${headerOffset}px 0px 0px` }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [headerOffset, gallery?.length]);

  const BOTTOM_NAV_H = 56;

  return (
    <main>
      {/* DESKTOP sticky under header */}
      {showSticky && (
        <div
          className="fixed inset-x-0 hidden md:block z-40"
          style={{ top: headerOffset }}
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="bg-white/95 dark:bg-neutral-900/95 supports-[backdrop-filter]:backdrop-blur rounded-lg shadow-md border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                    {heroSrc ? (
                      <Image
                        src={heroSrc}
                        alt="hero"
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-medium truncate">
                      {product?.name || "Product"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-gray-900">
                        {money(priceNow)}
                        {priceWas ? (
                          <span className="ml-1 line-through text-muted-foreground">
                            {money(priceWas)}
                          </span>
                        ) : null}
                      </span>
                      {offPct !== null && (
                        <span className="text-emerald-600">{offPct}% OFF</span>
                      )}
                      {ratingSummary.loaded && ratingSummary.total > 0 && (
                        <span className="ml-2">
                          ★ {ratingSummary.average.toFixed(1)} (
                          {ratingSummary.total})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <QtyControl
                    size="sm"
                    className="w-[160px]"
                    qty={qtyNow}
                    onDec={() => {
                      if (!inCartLine) return;
                      const next = Math.max(0, qtyNow - 1);
                      if (next === 0)
                        dispatch(
                          removeItem({
                            productId: product?._id,
                            variant: activeVariant
                              ? { id: activeVariant._id }
                              : null,
                          })
                        );
                      else
                        dispatch(
                          setQty({
                            productId: product?._id,
                            variant: activeVariant
                              ? { id: activeVariant._id }
                              : null,
                            qty: next,
                          })
                        );
                    }}
                    onInc={() => {
                      if (!inCartLine) return handleAddToCart();
                      dispatch(
                        setQty({
                          productId: product?._id,
                          variant: activeVariant
                            ? { id: activeVariant._id }
                            : null,
                          qty: qtyNow + 1,
                        })
                      );
                    }}
                  />

                  {qtyNow > 0 ? (
                    <Button
                      className="rounded-full h-9 px-4"
                      onClick={() => router.push("/checkout")}
                    >
                      Go to checkout
                    </Button>
                  ) : (
                    <Button
                      className="rounded-full h-9 px-4"
                      onClick={handleAddToCart}
                      disabled={!inStock || !product}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to cart
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE sticky above BottomNav */}
      {showSticky && (
        <div
          className="fixed inset-x-0 md:hidden z-40"
          style={{
            bottom: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom))`,
          }}
        >
          <div className="mx-auto max-w-[1200px] px-3">
            <div className="rounded-t-xl border-t shadow-lg bg-white/95 dark:bg-neutral-900/95 supports-[backdrop-filter]:backdrop-blur p-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold">{money(priceNow)}</div>
                {qtyNow > 0 ? (
                  <Button
                    className="rounded-full h-10 px-5 text-sm"
                    onClick={() => router.push("/checkout")}
                  >
                    Go to checkout
                  </Button>
                ) : (
                  <Button
                    className="rounded-full h-10 px-5 text-sm"
                    onClick={handleAddToCart}
                    disabled={!inStock || !product}
                  >
                    Add to cart
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        {/* LEFT: gallery (sentinel for sticky) */}
        <section className="lg:col-span-7" ref={galleryRef}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border overflow-hidden">
            <div className="relative aspect-[4/3] bg-white">
              {heroSrc ? (
                <Image
                  src={heroSrc}
                  alt={product?.name || "Product image"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 700px"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              {qtyNow > 0 && (
                <Badge className="absolute top-3 left-3 bg-yellow-50 text-yellow-900">
                  In cart • {qtyNow}
                </Badge>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT: summary card */}
        <aside className="lg:col-span-5">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border p-5 md:p-6 space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                {product?.name}
              </h1>
              {ratingSummary.loaded && ratingSummary.total > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Stars value={ratingSummary.average} />
                  <span className="font-medium tabular-nums">
                    {ratingSummary.average.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({ratingSummary.total})
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <div className="text-2xl font-bold">{money(priceNow)}</div>
              {priceWas && (
                <div className="text-sm text-muted-foreground line-through">
                  {money(priceWas)}
                </div>
              )}
              {offPct !== null && (
                <div className="text-sm text-emerald-600">{offPct}% OFF</div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full ${
                  inStock ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  inStock ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {inStock ? "In stock" : "Out of stock"}
              </span>
            </div>

            {/* Variants (ring visible, same line) */}
            {variants.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Variants</div>
                <div className="flex items-center gap-3 flex-wrap">
                  {variants.map((v, i) => {
                    const img = getVariantHero(v, heroSrc);
                    const selected = i === selectedIdx;
                    return (
                      <button
                        key={v?._id || i}
                        type="button"
                        onClick={() => setSelectedIdx(i)}
                        className={[
                          "relative p-0.5 rounded-full transition",
                          selected
                            ? "ring-2 ring-yellow-400"
                            : "ring-1 ring-slate-200 hover:ring-slate-300",
                        ].join(" ")}
                        aria-pressed={selected}
                        title={v?.variantName || v?.sku || `Option ${i + 1}`}
                      >
                        <span className="block h-10 w-10 rounded-full overflow-hidden bg-muted">
                          {img ? (
                            <Image
                              src={img}
                              alt={v?.variantName || `variant-${i}`}
                              width={40}
                              height={40}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <span className="block h-full w-full bg-muted" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Qty + primary action */}
            <div className="space-y-3">
              <QtyControl
                size="md"
                qty={qtyNow}
                onDec={() => {
                  if (!inCartLine) return;
                  const next = Math.max(0, qtyNow - 1);
                  if (next === 0)
                    dispatch(
                      removeItem({
                        productId: product?._id,
                        variant: activeVariant ? { id: activeVariant._id } : null,
                      })
                    );
                  else
                    dispatch(
                      setQty({
                        productId: product?._id,
                        variant: activeVariant ? { id: activeVariant._id } : null,
                        qty: next,
                      })
                    );
                }}
                onInc={() => {
                  if (!inCartLine) return handleAddToCart();
                  dispatch(
                    setQty({
                      productId: product?._id,
                      variant: activeVariant ? { id: activeVariant._id } : null,
                      qty: qtyNow + 1,
                    })
                  );
                }}
              />

              {qtyNow > 0 ? (
                <Button
                  className="w-full h-11 rounded-xl text-[14px] font-semibold"
                  onClick={() => router.push("/checkout")}
                >
                  Go to checkout
                </Button>
              ) : (
                <Button
                  className="w-full h-11 rounded-xl text-[14px] font-semibold"
                  onClick={handleAddToCart}
                  disabled={!inStock || !product}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to cart
                </Button>
              )}
            </div>

            <Separator className="my-2" />

            {product?.shortDescription ? (
              <p className="text-sm text-muted-foreground leading-6">
                {product.shortDescription}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {/* TABS: Overview / Specs / Reviews */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pb-16">
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="specs">Specs</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {product?.longDescription ? (
              <div className="prose dark:prose-invert max-w-none text-sm leading-7">
                <p>{product.longDescription}</p>
              </div>
            ) : null}

            {Array.isArray(product?.descImages) &&
              product.descImages.length > 0 && (
                <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
                  <div className="px-3 sm:px-6">
                    <div className="space-y-3">
                      {product.descImages.map((img, i) => (
                        <div key={img?._id || i}>
                          {img?.path ? (
                            <img
                              src={img.path}
                              alt={img?.alt || `desc-${i}`}
                              className="block w-full h-auto object-contain"
                              loading="lazy"
                              draggable={false}
                            />
                          ) : (
                            <div className="h-[40vh] bg-muted" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
          </TabsContent>

          {/* SPECS */}
          <TabsContent value="specs" className="mt-6">
            {Array.isArray(product?.additionalInfo) &&
            product.additionalInfo.length > 0 ? (
              <div className="rounded-2xl border overflow-hidden overflow-x-auto">
                <Table className="text-sm min-w-[560px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40%]">Specification</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.additionalInfo.map((row, idx) => (
                      <TableRow
                        key={`${row?.label}-${idx}`}
                        className="odd:bg-muted/10 hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="text-muted-foreground">
                          {row?.label}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row?.value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No specifications added.
              </div>
            )}
          </TabsContent>

          {/* REVIEWS */}
          <TabsContent value="reviews" className="mt-6">
            <ReviewsTab productId={product?._id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* spacer so mobile sticky doesn’t overlap the end */}
      <div className="h-[80px] md:h-0" />
    </main>
  );
}
