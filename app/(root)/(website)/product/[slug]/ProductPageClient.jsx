"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";

/* data */
import useFetch from "@/hooks/useFetch";
import { addItem, setQty, removeItem, selectItemsMap } from "@/store/cartSlice";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

/* icons */
import { ChevronLeft, ShoppingCart, Star } from "lucide-react";

/* media */
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

/* swiper */
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

/* animation */
import { motion, AnimatePresence } from "framer-motion";

/* ------------ helpers ------------ */
const api = axios.create({ baseURL: "/", withCredentials: true });

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

/* small animation helpers */
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
};
const slideDown = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};
const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
};

/* NEW: staggered list + item variants */
const listStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.06 },
  },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

/* NEW: animated price flip on change */
const AnimatedPrice = ({ value, className = "" }) => (
  <AnimatePresence mode="popLayout">
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className={className}
    >
      {value}
    </motion.span>
  </AnimatePresence>
);

/* stars + utilities for Reviews */
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
            } `}
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

/* ===================== ReviewsTab ===================== */
function ReviewsTab({ productId, animateUI }) {
  const [summary, setSummary] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(6);
  const [sort, setSort] = React.useState("newest");
  const [ratingFilter, setRatingFilter] = React.useState("all");
  const [isLoadingList, setIsLoadingList] = React.useState(false);

  const loadSummary = React.useCallback(async () => {
    if (!productId) return;
    try {
      const { data } = await api.get("/api/website/reviews/summary", {
        params: { productId },
      });
      if (data?.success) setSummary(data.data);
    } catch {}
  }, [productId]);

  const loadPage = React.useCallback(
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
  const [open, setOpen] = React.useState(false);
  const [formRating, setFormRating] = React.useState(5);
  const [formTitle, setFormTitle] = React.useState("");
  const [formBody, setFormBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

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
    <motion.div
      className="rounded-2xl border p-5 md:p-6 space-y-6"
      {...(animateUI ? fadeIn : {})}
    >
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
            <DialogTrigger asChild>
              <Button className="mt-4 w-full rounded-full">
                Write a review
              </Button>
            </DialogTrigger>
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
              const pct = totalCount
                ? Math.round((count / totalCount) * 100)
                : 0;
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

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-muted-foreground">
          {total} review{total === 1 ? "" : "s"}
        </div>
        <Separator orientation="vertical" className="hidden sm:block h-6" />
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

      {/* List */}
      <motion.div
        className="space-y-4"
        variants={listStagger}
        initial={animateUI ? "hidden" : false}
        animate={animateUI ? "show" : false}
      >
        {items.map((r) => (
          <motion.div
            key={r._id}
            className="rounded-2xl border p-4"
            variants={item}
            layout
          >
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
          </motion.div>
        ))}

        {isLoadingList && items.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading reviews…</div>
        )}
        {!isLoadingList && items.length === 0 && (
          <div className="text-sm text-muted-foreground">No reviews yet.</div>
        )}

        {items.length < total && (
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
      </motion.div>
    </motion.div>
  );
}

/* ===================== Product Page ===================== */
export default function ProductPage() {
  const { slug } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const { data, isLoading } = useFetch(
    "product",
    slug ? `/api/website/products/get-by-slug/${slug}` : null
  );
  const product = data?.success ? data.data : null;

  const dataReady = !!product && !isLoading;
  const [animateUI, setAnimateUI] = useState(false);
  useEffect(() => {
    if (dataReady) {
      const id = requestAnimationFrame(() => setAnimateUI(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAnimateUI(false);
    }
  }, [dataReady]);

  /* NEW: rating summary for product card + sticky bar */
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

  /* variants */
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const [selectedIdx, setSelectedIdx] = useState(-1);
  useEffect(() => {
    if (variants.length > 0 && selectedIdx === -1) setSelectedIdx(0);
  }, [variants, selectedIdx]);
  const activeVariant = useMemo(
    () => (selectedIdx >= 0 ? variants[selectedIdx] : null),
    [selectedIdx, variants]
  );

  /* gallery */
  const gallery = useMemo(() => {
    if (activeVariant?.productGallery?.length)
      return activeVariant.productGallery;
    const base = [];
    if (product?.heroImage?.path) base.push(product.heroImage);
    if (Array.isArray(product?.productMedia))
      base.push(...product.productMedia);
    return base;
  }, [product, activeVariant]);
  const galleryKey = useMemo(
    () =>
      Array.isArray(gallery)
        ? gallery.map((g) => g?._id || g?.path || "").join("|")
        : "empty",
    [gallery]
  );
  const heroSrc =
    product?.heroImage?.path ||
    (Array.isArray(product?.productMedia)
      ? product.productMedia[0]?.path
      : "") ||
    gallery?.[0]?.path ||
    "";

  const effMrp = toNum(activeVariant?.mrp ?? product?.mrp);
  const effSp = toNum(activeVariant?.specialPrice ?? product?.specialPrice);
  const off = percentOff(effMrp, effSp);
  const priceNow = off ? effSp : effMrp;
  const priceWas = off ? effMrp : null;
  const inStock = inferInStock(activeVariant || product);

  const itemsMap = useSelector(selectItemsMap) || {};
  const lineKey = `${product?._id || ""}|${activeVariant?._id || ""}`;
  const inCartLine = itemsMap[lineKey];

  /* media state */
  const mainSwiperRef = useRef(null);
  const [activeImg, setActiveImg] = useState(0);
  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const onVariantClick = useCallback((idx) => setSelectedIdx(idx), []);
  useEffect(() => {
    if (mainSwiperRef.current?.slideTo) mainSwiperRef.current.slideTo(0, 0);
    setActiveImg(0);
    setLightboxIndex(0);
  }, [selectedIdx, gallery?.length]);

  const handleAddToCart = () => {
    if (!product) return;
    const primaryImage = heroSrc || gallery?.[activeImg]?.path || undefined;
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
  };

  // NEW: go to checkout
  const goToCheckout = useCallback(() => {
    router.push("/checkout");
  }, [router]);

  /* sticky bars */
  const galleryWrapRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(0);
  const [mobileNavHeight, setMobileNavHeight] = useState(0); // measure BottomNav height

  useEffect(() => {
    const measureHeader = () => {
      const hdr = document.querySelector("header");
      setHeaderOffset(hdr ? hdr.getBoundingClientRect().height : 0);
    };
    measureHeader();
    window.addEventListener("resize", measureHeader, { passive: true });
    return () => window.removeEventListener("resize", measureHeader);
  }, []);

  // measure bottom nav
  useEffect(() => {
    const el = document.querySelector('nav[aria-label="Mobile Navigation"]');
    if (!el) {
      setMobileNavHeight(0);
      return;
    }
    const measure = () =>
      setMobileNavHeight(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const el = galleryWrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      {
        root: null,
        threshold: 0,
        rootMargin: `-${headerOffset + 8}px 0px 0px 0px`,
      }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [galleryKey, headerOffset]);

  /* skeleton */
  const Skeleton = () => (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
      <div className="lg:col-span-7">
        <div className="rounded-2xl border overflow-hidden">
          <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
          <div className="p-3 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-16 h-16 bg-muted animate-pulse rounded-md"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-5">
        <div className="rounded-2xl border p-6 space-y-4">
          <div className="h-7 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded" />
          <div className="h-8 w-28 bg-muted animate-pulse rounded" />
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );

  return (
    <main>
      {/* Desktop top sticky */}
      <AnimatePresence>
        {animateUI && showStickyBar && (
          <motion.div
            className="fixed inset-x-0 z-40 hidden md:block"
            style={{ top: headerOffset + 8 }}
            {...slideDown}
          >
            <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
              <div className="bg-white/95 dark:bg-neutral-900/95 supports-[backdrop-filter]:backdrop-blur rounded-lg shadow-md border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      className="relative w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0"
                      {...fadeIn}
                    >
                      {heroSrc ? (
                        <Image
                          src={heroSrc}
                          alt="hero"
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : null}
                    </motion.div>
                    <div className="truncate">
                      <div className="text-sm font-medium truncate">
                        {product?.name || "Product"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          <AnimatedPrice value={formatPrice(priceNow)} />{" "}
                          {priceWas ? (
                            <span className="ml-1 line-through">
                              {formatPrice(priceWas)}
                            </span>
                          ) : null}
                        </span>
                        {ratingSummary.loaded && ratingSummary.total > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Stars value={ratingSummary.average} size={14} />
                            <span className="tabular-nums">
                              {ratingSummary.average.toFixed(1)}
                            </span>
                            <span>({ratingSummary.total})</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {variants.length > 0 && (
                      <div className="w-[220px]">
                        <Select
                          value={String(selectedIdx)}
                          onValueChange={(val) => onVariantClick(Number(val))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            {activeVariant ? (
                              <div className="flex items-center gap-2 truncate">
                                <span className="relative inline-block h-5 w-5 rounded-sm overflow-hidden bg-muted">
                                  <Image
                                    src={getVariantHero(activeVariant, heroSrc)}
                                    alt="variant"
                                    fill
                                    sizes="20px"
                                    className="object-cover"
                                  />
                                </span>
                                <span className="truncate">
                                  {activeVariant?.variantName ||
                                    activeVariant?.sku ||
                                    "Variant"}
                                </span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Variant" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {variants.map((v, i) => {
                              const img = getVariantHero(v, heroSrc);
                              return (
                                <SelectItem key={v?._id || i} value={String(i)}>
                                  <div className="flex items-center gap-2">
                                    <span className="relative inline-block h-5 w-5 rounded-sm overflow-hidden bg-muted">
                                      {img ? (
                                        <Image
                                          src={img}
                                          alt={v?.variantName || `variant-${i}`}
                                          fill
                                          sizes="20px"
                                          className="object-cover"
                                        />
                                      ) : null}
                                    </span>
                                    <span className="truncate">
                                      {v?.variantName ||
                                        v?.sku ||
                                        `Option ${i + 1}`}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="inline-flex items-center rounded-md border bg-background h-9">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 h-9"
                        onClick={() => {
                          if (!inCartLine) return;
                          const next = Math.max(0, (inCartLine.qty || 1) - 1);
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
                        aria-label="Decrease quantity"
                      >
                        -
                      </Button>
                      <div className="px-3 py-1 text-sm font-medium w-10 text-center select-none">
                        {inCartLine ? inCartLine.qty || 0 : 0}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 h-9"
                        onClick={() => {
                          if (!inCartLine)
                            return dispatch(
                              addItem({
                                productId: product?._id,
                                slug,
                                name: product?.name,
                                qty: 1,
                                price: priceNow,
                                mrp: effMrp,
                                image: heroSrc,
                                variant: activeVariant
                                  ? { id: activeVariant._id }
                                  : null,
                              })
                            );
                          dispatch(
                            setQty({
                              productId: product?._id,
                              variant: activeVariant
                                ? { id: activeVariant._id }
                                : null,
                              qty: (inCartLine.qty || 0) + 1,
                            })
                          );
                        }}
                        aria-label="Increase quantity"
                      >
                        +
                      </Button>
                    </div>

                    <Button
                      className="rounded-full h-9 px-4"
                      onClick={inCartLine ? goToCheckout : handleAddToCart}
                      disabled={
                        !product || isLoading || (!inCartLine && !inStock)
                      }
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {inCartLine ? "Checkout" : "Add to cart"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom sticky — floating pill above BottomNav (price + CTA) */}
      <AnimatePresence>
        {animateUI && showStickyBar && (
          <motion.div
            className="fixed inset-x-0 z-40 md:hidden pointer-events-none"
            style={{
              bottom: `calc(${Math.max(
                mobileNavHeight || 20,
                0
              )}px + env(safe-area-inset-bottom) + 12px)`,
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
          >
            <div className="mx-auto max-w-screen-sm px-3 flex justify-center">
              <div className="pointer-events-auto w-full max-w-[min(560px,90vw)] rounded-full border shadow-xl bg-white/90 dark:bg-neutral-900/90 supports-[backdrop-filter]:backdrop-blur backdrop-blur px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="pl-1 pr-2 text-base font-semibold tabular-nums">
                    <AnimatedPrice value={formatPrice(priceNow)} />
                  </div>
                  <Button
                    className="rounded-full h-10 px-5 text-sm"
                    onClick={inCartLine ? goToCheckout : handleAddToCart}
                    disabled={
                      !product || isLoading || (!inCartLine && !inStock)
                    }
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {inCartLine ? "Checkout" : "Add to cart"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER ROW */}
      {dataReady ? (
        <motion.div
          className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-8 pb-2"
          {...(animateUI ? fadeUp : {})}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm text-muted-foreground">
                {product?.category?.name || "Category"}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              SKU:{" "}
              <span className="font-medium">{product?.modelNumber || "-"}</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-8 pb-2">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
      )}

      {/* MAIN GRID */}
      {dataReady ? (
        <motion.div
          className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10"
          {...(animateUI ? fadeUp : {})}
        >
          {/* LEFT: GALLERY (sentinel) */}
          <section className="lg:col-span-7" ref={galleryWrapRef}>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border overflow-hidden">
              {/* main image */}
              <motion.div className="relative" {...(animateUI ? fadeIn : {})}>
                {Array.isArray(gallery) && gallery.length ? (
                  <Swiper
                    key={galleryKey}
                    onSwiper={(swiper) => (mainSwiperRef.current = swiper)}
                    onSlideChange={(s) => {
                      setActiveImg(s.activeIndex);
                      setLightboxIndex(s.activeIndex);
                    }}
                    slidesPerView={1}
                    spaceBetween={8}
                    style={{ width: "100%" }}
                  >
                    {gallery.map((g, idx) => (
                      <SwiperSlide key={g?._id || g?.path || idx}>
                        <div className="relative aspect-[4/3] bg-white">
                          {g?.path ? (
                            <Image
                              src={g.path}
                              alt={g?.alt || product?.name || `img-${idx}`}
                              fill
                              sizes="(max-width: 1024px) 100vw, 700px"
                              className="object-contain"
                              priority={idx === 0}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted" />
                          )}
                          <div className="absolute top-3 right-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setLightboxIndex(idx);
                                setOpenLightbox(true);
                              }}
                            >
                              Zoom
                            </Button>
                          </div>
                          {inCartLine && idx === activeImg && (
                            <Badge className="absolute top-3 left-3 bg-yellow-50 text-yellow-900">
                              In cart • {inCartLine.qty || 0}
                            </Badge>
                          )}
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : (
                  <div className="aspect-[4/3] grid place-items-center text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </motion.div>

              {/* horizontal thumbs */}
              {Array.isArray(gallery) && gallery.length > 1 && (
                <div className="p-3">
                  <ScrollArea className="w-full">
                    <motion.div
                      className="flex gap-2.5 md:gap-3 pb-1"
                      {...(animateUI ? fadeIn : {})}
                    >
                      {gallery.map((g, i) => (
                        <motion.button
                          key={g?._id || g?.path || i}
                          onClick={() => {
                            mainSwiperRef.current?.slideTo(i);
                            setActiveImg(i);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative w-14 h-14 md:w-16 md:h-16 rounded-md border overflow-hidden transition ${
                            i === activeImg
                              ? "ring-2 ring-yellow-300"
                              : "hover:opacity-90"
                          }`}
                          aria-label={`View image ${i + 1}`}
                        >
                          {g?.path ? (
                            <Image
                              src={g.path}
                              alt={g?.alt || `thumb-${i}`}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted" />
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: SUMMARY */}
          <motion.aside
            className="lg:col-span-5"
            {...(animateUI ? fadeUp : {})}
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border p-5 md:p-6 space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  {product?.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {product?.shortDescription}
                </p>
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
                <div className="text-2xl font-bold">
                  <AnimatedPrice value={formatPrice(priceNow)} />
                </div>
                {priceWas && (
                  <div className="text-sm text-muted-foreground line-through">
                    {formatPrice(priceWas)}
                  </div>
                )}
                {off !== null && (
                  <div className="text-sm text-emerald-600">{off}% OFF</div>
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

              {/* variants grid */}
              {variants.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Variants</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {variants.map((v, i) => {
                      const img = getVariantHero(v, heroSrc);
                      const selected = i === selectedIdx;
                      return (
                        <motion.button
                          key={v?._id || i}
                          onClick={() => onVariantClick(i)}
                          type="button"
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.97 }}
                          className={`relative h-10 w-10 rounded-full overflow-hidden border ${
                            selected
                              ? "ring-2 ring-offset-2 ring-yellow-300"
                              : ""
                          }`}
                          aria-pressed={selected}
                          title={v?.variantName || v?.sku || `Option ${i + 1}`}
                        >
                          {img ? (
                            <Image
                              src={img}
                              alt={v?.variantName || `variant-${i}`}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-muted" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* actions */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <div className="inline-flex items-center rounded-md border bg-background">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3"
                    onClick={() => {
                      if (!inCartLine) return;
                      const next = Math.max(0, (inCartLine.qty || 1) - 1);
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
                  >
                    -
                  </Button>
                  <div className="px-4 py-2 text-sm font-medium select-none">
                    {inCartLine ? inCartLine.qty || 0 : 0}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3"
                    onClick={() => {
                      if (!inCartLine)
                        return dispatch(
                          addItem({
                            productId: product?._id,
                            slug,
                            name: product?.name,
                            qty: 1,
                            price: priceNow,
                            mrp: effMrp,
                            image: heroSrc || gallery?.[activeImg]?.path,
                            variant: activeVariant
                              ? { id: activeVariant._id }
                              : null,
                          })
                        );
                      dispatch(
                        setQty({
                          productId: product?._id,
                          variant: activeVariant
                            ? { id: activeVariant._id }
                            : null,
                          qty: (inCartLine.qty || 0) + 1,
                        })
                      );
                    }}
                  >
                    +
                  </Button>
                </div>

                <Button
                  className="rounded-full flex-1"
                  onClick={inCartLine ? goToCheckout : handleAddToCart}
                  disabled={!product || isLoading || (!inCartLine && !inStock)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />{" "}
                  {inCartLine ? "Checkout" : "Add to cart"}
                </Button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : (
        <Skeleton />
      )}

      {/* TABS: Overview / Specs / Reviews */}
      {dataReady ? (
        <motion.div
          className="mx-auto max-w-[1200px] px-4 sm:px-6 pb-16"
          {...(animateUI ? fadeUp : {})}
        >
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3 md:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specs">Specs</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {product?.longDescription ? (
                <motion.div
                  className="prose dark:prose-invert max-w-none text-sm leading-7"
                  {...(animateUI ? fadeIn : {})}
                >
                  <p>{product.longDescription}</p>
                </motion.div>
              ) : null}

              {Array.isArray(product?.descImages) &&
                product.descImages.length > 0 && (
                  <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
                    <div className="px-3 sm:px-6">
                      <div className="space-y-3">
                        {product.descImages.map((img, i) => (
                          <motion.div
                            key={img?._id || i}
                            {...(animateUI ? fadeIn : {})}
                          >
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
                          </motion.div>
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
                <motion.div
                  className="rounded-2xl border overflow-hidden overflow-x-auto"
                  {...(animateUI ? fadeIn : {})}
                >
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
                          className="odd:bg-muted/10 hover:bg-muted-20 transition-colors"
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
                </motion.div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No specifications added.
                </div>
              )}
            </TabsContent>

            {/* REVIEWS */}
            <TabsContent value="reviews" className="mt-6">
              <ReviewsTab productId={product?._id} animateUI={animateUI} />
            </TabsContent>
          </Tabs>
        </motion.div>
      ) : null}

      {/* spacer for mobile sticky */}
      <div className="h-16 md:h-0" />

      {/* LIGHTBOX */}
      <Lightbox
        open={openLightbox}
        index={lightboxIndex}
        close={() => {
          setOpenLightbox(false);
          setActiveImg(lightboxIndex);
          if (mainSwiperRef.current?.slideTo)
            mainSwiperRef.current.slideTo(lightboxIndex);
        }}
        slides={(gallery || []).map((g) => ({
          src: g?.path || "",
          alt: g?.alt || product?.name,
        }))}
        plugins={[Thumbnails]}
        thumbnails={{ position: "bottom" }}
        on={{
          view: ({ index }) => {
            setLightboxIndex(index);
            setActiveImg(index);
            if (mainSwiperRef.current?.slideTo)
              mainSwiperRef.current.slideTo(index);
          },
        }}
      />
    </main>
  );
}
