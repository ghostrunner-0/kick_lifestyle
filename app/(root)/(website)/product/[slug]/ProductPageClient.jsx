"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { Pagination } from "swiper/modules";
import "swiper/css/pagination";
import { trackAddToCart, trackProductView } from "@/lib/analytics";

/* store */
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
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/* icons */
import {
  ChevronLeft,
  ShoppingCart,
  Star,
  ChevronsUpDown,
  Check,
  Truck,
  Building2,
} from "lucide-react";

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

/* toast */
import { showToast } from "@/lib/ShowToast";

/* ------------ helpers ------------ */
const api = axios.create({ baseURL: "/", withCredentials: true });

/* Motion wrapper for shadcn Button so we can use whileTap/whileHover */
const MotionButton = motion(Button);

/* step for +/-, default = 1 */
const STEP = 1;

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

/* ---------- STOCK: fixed logic (variant-aware) ---------- */
const variantInStock = (v) => {
  if (!v || typeof v !== "object") return false;
  if (typeof v.inStock === "boolean") return v.inStock;
  if (Number.isFinite(v?.stock)) return v.stock > 0;
  if (Number.isFinite(v?.inventory)) return v.inventory > 0;
  if (Number.isFinite(v?.quantity)) return v.quantity > 0;
  return true;
};
const productInStock = (p) => {
  if (!p || typeof p !== "object") return false;
  if (typeof p.inStock === "boolean") return p.inStock;
  if (Number.isFinite(p?.stock)) return p.stock > 0;
  if (Number.isFinite(p?.inventory)) return p.inventory > 0;
  if (Number.isFinite(p?.quantity)) return p.quantity > 0;
  if (Array.isArray(p?.variants)) return p.variants.some(variantInStock);
  return true;
};

/* Available stock for current selection (Infinity = uncapped) */
const getAvailableStock = (product, activeVariant) => {
  if (activeVariant && Number.isFinite(activeVariant?.stock)) {
    return Math.max(0, activeVariant.stock);
  }
  if (Number.isFinite(product?.stock)) {
    return Math.max(0, product.stock);
  }
  return Infinity;
};
/* ------------------------------------------------------- */

const getVariantHero = (v, fallback) =>
  v?.heroImage?.path ||
  v?.productGallery?.[0]?.path ||
  v?.swatchImage?.path ||
  fallback ||
  "";

/* ===== Animations ===== */
const spring = { type: "spring", stiffness: 260, damping: 22, mass: 0.7 };

const pageStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
};
const slideDown = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};
const slideUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: 12, transition: { duration: 0.2 } },
};

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

/* ===================== Desktop Right Side Panel (stacked) ===================== */
function DesktopRightSidePanel({ summary, items }) {
  const hasReviews = (summary?.total || 0) > 0;
  const topFive = (items || []).slice(0, 5);

  return (
    <div className="hidden md:block space-y-4">
      {/* TOP: Reviews (if any) OR Free Delivery */}
      {hasReviews ? (
        <div className="rounded-2xl border bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4 md:p-5 shadow-sm min-h-[128px]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Ratings & reviews</div>
            <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]">
              <Stars value={Number(summary?.average || 0)} size={12} />
              <span className="tabular-nums font-medium">
                {Number(summary?.average || 0).toFixed(1)}
              </span>
              <span className="text-muted-foreground">• {summary?.total}</span>
            </div>
          </div>

          <div className="mt-3">
            <Swiper
              modules={[Pagination]}
              pagination={{
                clickable: true,
                bulletClass: "rv-bullet",
                bulletActiveClass: "rv-bullet-active",
              }}
              slidesPerView={1}
              spaceBetween={12}
              speed={260}
              autoHeight
              style={{ width: "100%" }}
            >
              {topFive.map((r) => (
                <SwiperSlide key={r._id}>
                  <div className="py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Stars value={r.rating} size={12} />
                      <span>{fmtDate(r.createdAt)}</span>
                    </div>
                    {r.title ? (
                      <div className="mt-1 text-sm font-medium">{r.title}</div>
                    ) : null}
                    <p className="mt-1 text-sm leading-6 line-clamp-4">
                      {r.review}
                    </p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      ) : (
        <div className="">
          {/* FREE delivery card with #fcba17 gradient */}
          <div
            className="h-[72px] rounded-2xl px-4 py-3 border flex items-center justify-between gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
            style={{
              background:
                "linear-gradient(135deg, #fcba17 0%, #ffd166 52%, #fff2b3 100%)",
              borderColor: "#f6c245",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-9 w-9 rounded-full grid place-items-center bg-white/80 text-amber-900 border border-amber-300">
                <Truck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-amber-900">
                  Free delivery on prepaid orders
                </div>
                <div className="text-xs text-amber-900/90 truncate">
                  Save shipping when you pay online at checkout
                </div>
              </div>
            </div>
          </div>

          {/* Corporate orders card */}
          <div className="h-[72px] rounded-2xl border bg-white px-4 py-3 mt-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-9 w-9 rounded-full grid place-items-center bg-neutral-900 text-white">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">Corporate orders</div>
                <div className="text-xs text-muted-foreground truncate">
                  Bulk pricing • Priority support
                </div>
              </div>
            </div>

            <Button
              className="rounded-full h-8 px-3 bg-neutral-900 text-white hover:bg-neutral-800"
              type="button"
              onClick={() => (window.location.href = "/corporate-orders")}
            >
              Enquire
            </Button>
          </div>
        </div>
      )}

      {/* slider bullets styling */}
      <style jsx global>{`
        .rv-bullet {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.22);
          margin: 0 4px !important;
          opacity: 1 !important;
        }
        .dark .rv-bullet {
          background: rgba(255, 255, 255, 0.28);
        }
        .rv-bullet-active {
          width: 18px;
          background: #facc15;
        }
        .dark .rv-bullet-active {
          background: #fbbf24;
        }
      `}</style>
    </div>
  );
}

/* ===================== Reviews Tab ===================== */
function ReviewsTab({ productId, animateUI }) {
  const auth = useSelector((s) => s?.authStore?.auth);
  const isAuthed = !!auth;

  const [summary, setSummary] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(6);
  const [sort] = React.useState("newest");
  const [ratingFilter] = React.useState("all");
  const [isLoadingList, setIsLoadingList] = React.useState(false);

  const [openDialog, setOpenDialog] = React.useState(false);
  const [form, setForm] = React.useState({ rating: 5, title: "", review: "" });
  const [submitting, setSubmitting] = React.useState(false);

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
          if (reset) {
            setItems(data.data.items || []);
            setPage(1);
          } else {
            setItems((prev) => [...prev, ...(data.data.items || [])]);
          }
        }
      } finally {
        setIsLoadingList(false);
      }
    },
    [productId, page, pageSize, sort, ratingFilter]
  );

  useEffect(() => {
    loadSummary();
    loadPage(true);
  }, [loadSummary, loadPage]);

  const handleSubmitReview = async (e) => {
    e?.preventDefault?.();
    if (!isAuthed || !productId) {
      showToast("error", "Please login to write a review.");
      return;
    }
    if (!form.title?.trim() || !form.review?.trim()) {
      showToast("warning", "Please fill the title and review.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        product: productId,
        rating: Number(form.rating) || 5,
        title: form.title.trim(),
        review: form.review.trim(),
      };
      const { data } = await api.post("/api/website/reviews", payload);
      if (data?.success) {
        await Promise.all([loadSummary(), loadPage(true)]);
        setForm({ rating: 5, title: "", review: "" });
        setOpenDialog(false);
        showToast(
          "success",
          "Thanks for your review! Your feedback helps others."
        );
      } else {
        showToast("error", data?.message || "Something went wrong.");
      }
    } catch {
      showToast("error", "Could not submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      id="reviews"
      className="rounded-2xl border p-5 md:p-6 space-y-6"
      variants={animateUI ? fadeIn : undefined}
      initial="hidden"
      animate="show"
    >
      {summary ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 rounded-xl border p-4">
            <div className="text-sm text-muted-foreground">Average rating</div>
            <div className="mt-1 flex items	end gap-2">
              <div className="text-4xl font-semibold">
                {Number(summary.average || 0).toFixed(1)}
              </div>
              <Stars value={Number(summary.average || 0)} size={18} />
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {summary.total || 0} review{(summary.total || 0) === 1 ? "" : "s"}
            </div>
          </div>

          <div className="md:col-span-8 rounded-xl border p-4">
            <div className="text-sm font-medium mb-3">Rating breakdown</div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary?.breakdown?.[star] || 0;
                const totalCount = summary?.total || 0;
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
      ) : null}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="text-sm text-muted-foreground">
          {total} review{total === 1 ? "" : "s"}
        </div>

        {isAuthed ? (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <MotionButton
                size="sm"
                className="rounded-full"
                type="button"
                whileHover={{ scale: 1.02 }}
              >
                Write a review
              </MotionButton>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-md"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Write a review</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Rating</div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <motion.button
                        type="button"
                        key={r}
                        onClick={() => setForm((f) => ({ ...f, rating: r }))}
                        aria-label={`Rate ${r} star${r === 1 ? "" : "s"}`}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Star
                          size={20}
                          className={
                            r <= form.rating
                              ? "fill-yellow-400 stroke-yellow-400"
                              : "stroke-muted-foreground"
                          }
                        />
                      </motion.button>
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {form.rating}/5
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Title</div>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="Great sound & battery!"
                    required
                  />
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Review</div>
                  <Textarea
                    value={form.review}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, review: e.target.value }))
                    }
                    rows={5}
                    placeholder="Share details about comfort, ANC, mic quality, etc."
                    required
                  />
                </div>

                <DialogFooter className="gap-2">
                  <MotionButton
                    type="button"
                    variant="secondary"
                    onClick={() => setOpenDialog(false)}
                    whileTap={{ scale: 0.97 }}
                  >
                    Cancel
                  </MotionButton>
                  <MotionButton
                    type="submit"
                    disabled={submitting}
                    whileTap={{ scale: 0.97 }}
                  >
                    {submitting ? "Submitting..." : "Submit review"}
                  </MotionButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please <span className="font-medium text-foreground">login</span> to
            write a review.
          </div>
        )}
      </div>

      <motion.div
        className="space-y-4"
        variants={listStagger}
        initial={animateUI ? "hidden" : false}
        animate={animateUI ? "show" : false}
      >
        {items.map((r) => (
          <motion.div
            key={r._id}
            className="rounded-xl border p-4"
            variants={item}
            layout
            transition={spring}
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
      </motion.div>
    </motion.div>
  );
}

/* ===================== Product Page ===================== */
export default function ProductPageClient({
  slug,
  initialProduct,
  initialReviewsSummary,
  initialReviews,
}) {
  const router = useRouter();
  const dispatch = useDispatch();

  const product = initialProduct;
  const dataReady = !!product;

  const [animateUI, setAnimateUI] = useState(false);
  useEffect(() => {
    if (dataReady) {
      const id = requestAnimationFrame(() => setAnimateUI(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAnimateUI(false);
    }
  }, [dataReady]);

  const ratingSummary = {
    average: Number(initialReviewsSummary?.average || 0),
    total: Number(initialReviewsSummary?.total || 0),
    loaded: true,
  };

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const [selectedIdx, setSelectedIdx] = useState(-1);
  useEffect(() => {
    if (variants.length > 0 && selectedIdx === -1) setSelectedIdx(0);
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
  // Track product view (GA4 + PostHog + FB Pixel)
  useEffect(() => {
    if (!dataReady || !product) return;

    const viewedPrice =
      Number(
        activeVariant?.specialPrice ??
          activeVariant?.mrp ??
          product?.specialPrice ??
          product?.mrp ??
          0
      ) || 0;

    trackProductView({
      productId: activeVariant?._id || product._id,
      name: activeVariant?.variantName
        ? `${product.name} - ${activeVariant.variantName}`
        : product.name,
      category: product.categoryName || product.catName || "Products",
      price: viewedPrice,
      currency: "NPR",
      variant: activeVariant?.variantName || activeVariant?.sku || undefined,
    });
  }, [dataReady, product, activeVariant]);

  /* stock flags */
  const inStock =
    activeVariant !== null
      ? variantInStock(activeVariant)
      : productInStock(product);

  /* available units for current selection */
  const availableStock = getAvailableStock(product, activeVariant);

  const itemsMap = useSelector(selectItemsMap) || {};
  const lineKey = `${product?._id || ""}|${activeVariant?._id || ""}`;
  const inCartLine = itemsMap[lineKey];

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

    // Respect availableStock when adding first time via main ATC
    const currentQty = inCartLine ? inCartLine.qty || 0 : 0;
    if (Number.isFinite(availableStock) && currentQty + STEP > availableStock) {
      showToast(
        "warning",
        availableStock === 0
          ? "This selection is currently out of stock."
          : `You can add up to ${availableStock} unit${
              availableStock > 1 ? "s" : ""
            } for this selection.`
      );
      return;
    }

    dispatch(
      addItem({
        productId: product?._id,
        slug,
        name: product?.name,
        qty: STEP,
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
    trackAddToCart({
      productId: product?._id,
      name: product?.name,
      category: product?.categoryName || product?.catName || "Products",
      price: priceNow,
      quantity: STEP,
      variant: activeVariant?.variantName,
      currency: "NPR",
    });
  };

  /* sticky bars (header + bottom-nav safe) */
  const galleryWrapRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(0);
  const [bottomNavOffset, setBottomNavOffset] = useState(0);

  // NEW: show mobile sticky only after main ATC leaves viewport
  const atcRef = useRef(null);
  const [showStickyMobile, setShowStickyMobile] = useState(false);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const measure = () =>
      setHeaderOffset(header.getBoundingClientRect().height || 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const nav = document.querySelector('nav[aria-label="Mobile Navigation"]');
    if (!nav) return;
    const measure = () =>
      setBottomNavOffset(nav.getBoundingClientRect().height || 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
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
        rootMargin: `-${Math.max(0, headerOffset + 8)}px 0px 0px 0px`,
      }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [galleryKey, headerOffset]);

  // Observe main "Add to cart" button to toggle mobile sticky
  useEffect(() => {
    if (typeof window === "undefined") return;
    const btn = atcRef.current;
    if (!btn) return;

    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          setShowStickyMobile(!entry.isIntersecting);
        });
      },
      { root: null, threshold: 0, rootMargin: "0px 0px -8px 0px" }
    );

    io.observe(btn);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, []);

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

  /* ==== STOCK-CAPPED +/- handlers (shared) ==== */
  const decQty = () => {
    if (!inCartLine) return;
    const next = Math.max(0, (inCartLine.qty || STEP) - STEP);
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
  };

  const incQty = () => {
    const current = inCartLine ? inCartLine.qty || 0 : 0;
    const next = current + STEP;

    if (Number.isFinite(availableStock) && next > availableStock) {
      showToast(
        "warning",
        availableStock === 0
          ? "This selection is currently out of stock."
          : `You can add up to ${availableStock} unit${
              availableStock > 1 ? "s" : ""
            } for this selection.`
      );
      return;
    }

    if (!inCartLine) {
      dispatch(
        addItem({
          productId: product?._id,
          slug,
          name: product?.name,
          qty: STEP,
          price: priceNow,
          mrp: effMrp,
          image: heroSrc || gallery?.[activeImg]?.path,
          variant: activeVariant ? { id: activeVariant._id } : null,
        })
      );

      trackAddToCart({
        productId: product?._id,
        name: product?.name,
        category: product?.categoryName || product?.catName || "Products",
        price: priceNow,
        quantity: STEP,
        variant: activeVariant?.variantName,
        currency: "NPR",
      });

      return;
    }

    // Case 2: already in cart → just update qty
    dispatch(
      setQty({
        productId: product?._id,
        variant: activeVariant ? { id: activeVariant._id } : null,
        qty: next,
      })
    );
  };

  const goCheckout = () => router.push("/checkout");

  /* scroll preserve helper */
  const scrollLockRef = useRef(0);
  const preserveScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    scrollLockRef.current = window.scrollY || window.pageYOffset || 0;
    requestAnimationFrame(() => window.scrollTo(0, scrollLockRef.current));
  }, []);

  /* shared layoutIds for animated rings */
  const THUMB_RING_ID = "thumb-ring";
  const VARIANT_RING_ID = "variant-ring";

  const currentQty = inCartLine ? inCartLine.qty || 0 : 0;
  const minusDisabled = !inCartLine || currentQty <= 0;
  const plusDisabled =
    Number.isFinite(availableStock) &&
    (inCartLine ? currentQty >= availableStock : availableStock === 0);

  return (
    <motion.main
      className="overflow-x-clip"
      variants={pageStagger}
      initial="hidden"
      animate="show"
    >
      {/* Desktop TOP sticky pill */}
      <AnimatePresence>
        {animateUI && showStickyBar && (
          <motion.div
            className="fixed inset-x-0 hidden md:block z-[35] pointer-events-none"
            style={{ top: Math.max(0, headerOffset + 8) }}
            variants={slideDown}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pointer-events-auto">
              <motion.div
                className="rounded-full border bg-white/95 dark:bg-neutral-900/95 supports-[backdrop-filter]:backdrop-blur shadow-md px-3 py-2 flex items-center justify-between gap-3"
                layout
                transition={spring}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    className="relative w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0"
                    layout
                  >
                    {heroSrc ? (
                      <Image
                        src={heroSrc}
                        alt="hero"
                        fill
                        sizes="32px"
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
                  {/* Sticky Variant Dropdown */}
                  {Array.isArray(variants) && variants.length > 0 ? (
                    <div className="hidden md:flex items-center">
                      <DropdownMenu
                        modal={false}
                        onOpenChange={(open) => {
                          preserveScroll();
                          if (!open) preserveScroll();
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <MotionButton
                            variant="outline"
                            size="sm"
                            className="rounded-full h-9 pl-2 pr-2.5 gap-2 flex items-center"
                            type="button"
                            aria-label="Select variant"
                            onClick={preserveScroll}
                            whileTap={{ scale: 0.97 }}
                          >
                            <span className="relative h-6 w-6 rounded-full overflow-hidden border shrink-0">
                              {getVariantHero(
                                variants[selectedIdx] || {},
                                heroSrc
                              ) ? (
                                <Image
                                  src={getVariantHero(
                                    variants[selectedIdx] || {},
                                    heroSrc
                                  )}
                                  alt={
                                    variants[selectedIdx]?.variantName ||
                                    variants[selectedIdx]?.sku ||
                                    "Variant"
                                  }
                                  fill
                                  sizes="24px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="block h-full w-full bg-muted" />
                              )}
                            </span>

                            <span className="max-w-[12rem] truncate text-xs md:text-sm">
                              {variants[selectedIdx]?.variantName ||
                                variants[selectedIdx]?.sku ||
                                `Option ${selectedIdx + 1}`}
                            </span>

                            <ChevronsUpDown className="ml-1 h-4 w-4 opacity-60" />
                          </MotionButton>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          className="w-[280px] p-1"
                          sideOffset={6}
                          onOpenAutoFocus={(e) => {
                            e.preventDefault();
                            preserveScroll();
                          }}
                          onCloseAutoFocus={(e) => {
                            e.preventDefault();
                            preserveScroll();
                          }}
                        >
                          <div className="max-h-72 overflow-y-auto">
                            {variants.map((v, i) => {
                              const img = getVariantHero(v, heroSrc);
                              const selected = i === selectedIdx;
                              return (
                                <DropdownMenuItem
                                  key={v?._id || i}
                                  onClick={() => {
                                    onVariantClick(i);
                                    preserveScroll();
                                  }}
                                  className="gap-2 py-2"
                                >
                                  <span className="relative h-8 w-8 rounded-full overflow-hidden border shrink-0">
                                    {img ? (
                                      <Image
                                        src={img}
                                        alt={
                                          v?.variantName ||
                                          v?.sku ||
                                          `Variant ${i + 1}`
                                        }
                                        fill
                                        sizes="32px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <span className="block h-full w-full bg-muted" />
                                    )}
                                  </span>

                                  <span className="flex-1 min-w-0">
                                    <span className="block text-sm truncate">
                                      {v?.variantName ||
                                        v?.sku ||
                                        `Option ${i + 1}`}
                                    </span>
                                    {v?.sku ? (
                                      <span className="block text-xs text-muted-foreground truncate">
                                        {v.sku}
                                      </span>
                                    ) : null}
                                  </span>

                                  {selected ? (
                                    <Check className="h-4 w-4 opacity-90" />
                                  ) : null}
                                </DropdownMenuItem>
                              );
                            })}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}

                  {/* STICKY COUNTER — stock-capped */}
                  <div className="inline-flex items-center rounded-full border bg-background h-9">
                    <MotionButton
                      type="button"
                      variant="ghost"
                      className="px-3 h-9 min-w-[40px]"
                      onClick={decQty}
                      aria-label="Decrease quantity"
                      disabled={minusDisabled}
                      whileTap={{ scale: 0.9 }}
                    >
                      –
                    </MotionButton>
                    <motion.div
                      className="px-3 py-1 text-sm font-medium w-8 text-center select-none tabular-nums"
                      key={currentQty}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      {currentQty}
                    </motion.div>
                    <MotionButton
                      type="button"
                      variant="ghost"
                      className="px-3 h-9 min-w-[40px]"
                      onClick={incQty}
                      aria-label="Increase quantity"
                      disabled={plusDisabled}
                      whileTap={{ scale: 0.9 }}
                    >
                      +
                    </MotionButton>
                  </div>

                  <MotionButton
                    className="rounded-full h-9 px-4"
                    onClick={inCartLine ? goCheckout : handleAddToCart}
                    disabled={!inStock || !product}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                    transition={spring}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {inCartLine ? "Go to checkout" : "Add to cart"}
                  </MotionButton>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom sticky — shows ONLY after main ATC leaves viewport */}
      <AnimatePresence>
        {animateUI && showStickyMobile && (
          <motion.div
            className="fixed inset-x-0 md:hidden z-[35]"
            style={{ bottom: Math.max(0, bottomNavOffset) }}
            initial={{ y: 64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 64, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 34,
              mass: 0.6,
            }}
          >
            <div className="mx-auto max-w-[1200px] px-3 pb-[calc(env(safe-area-inset-bottom)+8px)]">
              <div
                className="rounded-full border supports-[backdrop-filter]:backdrop-blur shadow-2xl px-4 py-2 flex items-center justify-between gap-3"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.92) 100%)",
                }}
              >
                <div className="text-base font-semibold">
                  <AnimatedPrice value={formatPrice(priceNow)} />
                </div>
                <MotionButton
                  className="rounded-full h-10 px-5 text-sm bg-[#fcba17] hover:bg-[#e6ab11] text-black"
                  onClick={inCartLine ? goCheckout : handleAddToCart}
                  disabled={!inStock || !product}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  transition={spring}
                >
                  {inCartLine ? "Go to checkout" : "Add to cart"}
                </MotionButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER ROW — hidden on mobile per request */}
      {dataReady ? (
        <motion.div
          className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-8 pb-2 hidden md:block"
          variants={fadeUp}
        >
          <div className="flex items-center justify-between">
            <MotionButton
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-8 px-2"
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </MotionButton>
            <div className="text-sm text-muted-foreground">
              SKU:{" "}
              <span className="font-medium">{product?.modelNumber || "-"}</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-8 pb-2 hidden md:block">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
      )}

      {/* MAIN GRID */}
      {dataReady ? (
        <motion.div
          className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10"
          variants={pageStagger}
        >
          {/* LEFT: GALLERY */}
          <section className="lg:col-span-7" ref={galleryWrapRef}>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border overflow-hidden product-gallery">
              {/* main image */}
              <motion.div variants={fadeIn}>
                {Array.isArray(gallery) && gallery.length ? (
                  <Swiper
                    key={`${galleryKey}|${activeVariant?._id || ""}`}
                    onSwiper={(swiper) => (mainSwiperRef.current = swiper)}
                    onSlideChange={(s) => {
                      setActiveImg(s.activeIndex);
                      setLightboxIndex(s.activeIndex);
                    }}
                    slidesPerView={1}
                    spaceBetween={8}
                    watchOverflow
                    allowTouchMove={gallery.length > 1}
                    autoHeight
                    observer
                    observeParents
                    speed={260}
                    style={{ width: "100%" }}
                  >
                    {gallery.map((g, idx) => (
                      <SwiperSlide key={g?._id || g?.path || idx}>
                        <motion.div
                          className="relative aspect-[4/3] bg-white slide-box"
                          initial={{ opacity: 0.6, scale: 0.98 }}
                          animate={{
                            opacity: idx === activeImg ? 1 : 0.9,
                            scale: idx === activeImg ? 1 : 0.995,
                          }}
                          transition={spring}
                        >
                          {g?.path ? (
                            <Image
                              src={g.path}
                              alt={g?.alt || product?.name || `img-${idx}`}
                              fill
                              sizes="(max-width: 1024px) 100vw, 700px"
                              className="object-contain select-none pointer-events-none"
                              draggable={false}
                              priority={idx === 0}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted" />
                          )}
                          <div className="absolute top-3 right-3">
                            <MotionButton
                              size="sm"
                              variant="secondary"
                              type="button"
                              onClick={() => {
                                preserveScroll();
                                setLightboxIndex(idx);
                                setOpenLightbox(true);
                              }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Zoom
                            </MotionButton>
                          </div>
                          {inCartLine && idx === activeImg && (
                            <Badge className="absolute top-3 left-3 bg-yellow-50 text-yellow-900">
                              In cart • {inCartLine.qty || 0}
                            </Badge>
                          )}
                        </motion.div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : (
                  <div className="aspect-[4/3] grid place-items-center text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </motion.div>
            </div>
            {/* horizontal thumbs */}
            {Array.isArray(gallery) && gallery.length > 1 && (
              <div className="pt-2">
                <ScrollArea className="w-full thumbs-scrollarea">
                  <motion.div
                    className="relative thumbs-row flex pt-1 ps-1 gap-2.5 md:gap-3 pb-1 pe-4"
                    variants={fadeIn}
                  >
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={`thumb-ring-${activeImg}`}
                        layoutId={THUMB_RING_ID}
                        className="absolute rounded-md pointer-events-none"
                        style={{ top: 0, left: 0, width: 0, height: 0 }}
                        transition={spring}
                      />
                    </AnimatePresence>

                    {gallery.map((g, i) => (
                      <motion.button
                        key={g?._id || g?.path || i}
                        type="button"
                        onClick={() => {
                          mainSwiperRef.current?.slideTo(i);
                          setActiveImg(i);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative w-14 h-14 md:w-16 md:h-16 rounded-md border overflow-hidden transition ${
                          i === activeImg
                            ? "ring-2 ring-yellow-300 ring-offset-1"
                            : "hover:opacity-90"
                        }`}
                        aria-label={`View image ${i + 1}`}
                      >
                        {i === activeImg && (
                          <motion.span
                            layoutId={THUMB_RING_ID}
                            className="absolute inset-0 rounded-md ring-2 ring-yellow-300 ring-offset-1"
                            transition={spring}
                          />
                        )}
                        {g?.path ? (
                          <Image
                            src={g.path}
                            alt={g?.alt || `thumb-${i}`}
                            fill
                            sizes="64px"
                            className="object-cover select-none pointer-events-none"
                            draggable={false}
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
          </section>

          {/* RIGHT: SUMMARY + Desktop Right Panel */}
          <motion.aside className="lg:col-span-5" variants={fadeUp}>
            <motion.div
              className="bg-white dark:bg-neutral-900 rounded-2xl border p-5 md:p-6 space-y-5"
              layout
              transition={spring}
            >
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  {product?.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {product?.shortDescription}
                </p>
                {ratingSummary.loaded && ratingSummary.total > 0 && (
                  <motion.div
                    className="flex items-center gap-2 text-sm"
                    layout
                  >
                    <Stars value={ratingSummary.average} />
                    <span className="font-medium tabular-nums">
                      {ratingSummary.average.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({ratingSummary.total})
                    </span>
                  </motion.div>
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
                  <motion.div
                    className="text-sm text-emerald-600"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {off}% OFF
                  </motion.div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${
                    inStock ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={inStock ? "in" : "out"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className={`text-sm font-medium ${
                      inStock ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {inStock ? "In stock" : "Out of stock"}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div
                className={`flex items-center gap-3 ${
                  variants.length > 0 ? "justify-between" : "justify-start"
                }`}
              >
                {variants.length > 0 && (
                  <div className="flex items-center gap-2 flex-1  flex-wrap">
                    <AnimatePresence initial={false}>
                      {variants.map((v, i) => {
                        const img = getVariantHero(v, heroSrc);
                        const selected = i === selectedIdx;
                        return (
                          <motion.button
                            key={v?._id || i}
                            type="button"
                            onClick={() => onVariantClick(i)}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.97 }}
                            className={`relative h-10 w-10 rounded-full overflow-hidden border transition ${
                              selected
                                ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
                                : ""
                            }`}
                            aria-pressed={selected}
                            title={
                              v?.variantName || v?.sku || `Option ${i + 1}`
                            }
                          >
                            {selected && (
                              <motion.span
                                layoutId={VARIANT_RING_ID}
                                className="absolute inset-0 rounded-full ring-2 ring-yellow-400 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
                                transition={spring}
                              />
                            )}
                            {img ? (
                              <Image
                                src={img}
                                alt={v?.variantName || `variant-${i}`}
                                fill
                                sizes="40px"
                                className="object-cover select-none pointer-events-none"
                                draggable={false}
                              />
                            ) : (
                              <div className="h-full w-full bg-muted" />
                            )}
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* MAIN COUNTER — stock-capped */}
                <div className="inline-flex items-center rounded-md border bg-background shrink-0">
                  <MotionButton
                    type="button"
                    variant="ghost"
                    className="px-3 min-w-[44px]"
                    onClick={decQty}
                    aria-label="Decrease quantity"
                    disabled={minusDisabled}
                    whileTap={{ scale: 0.9 }}
                  >
                    –
                  </MotionButton>
                  <motion.div
                    className="px-3 py-2 text-sm font-medium select-none tabular-nums w-[36px] text-center"
                    key={currentQty}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {currentQty}
                  </motion.div>
                  <MotionButton
                    type="button"
                    variant="ghost"
                    className="px-3 min-w-[44px]"
                    onClick={incQty}
                    aria-label="Increase quantity"
                    disabled={plusDisabled}
                    whileTap={{ scale: 0.9 }}
                  >
                    +
                  </MotionButton>
                </div>
              </div>

              <MotionButton
                ref={atcRef} /* <-- observed for mobile sticky toggle */
                className="rounded-full w-full bg-[#fcba17] hover:bg-[#e6ab11] text-black"
                onClick={inCartLine ? goCheckout : handleAddToCart}
                disabled={!inStock || !product}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.01 }}
                transition={spring}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />{" "}
                {inCartLine ? "Go to checkout" : "Add to cart"}
              </MotionButton>
            </motion.div>

            {/* DESKTOP white-space section (stacked) */}
            <div className="mt-4">
              <DesktopRightSidePanel
                summary={initialReviewsSummary}
                items={initialReviews?.items}
              />
            </div>
          </motion.aside>
        </motion.div>
      ) : (
        <Skeleton />
      )}

      {/* TABS */}
      {dataReady ? (
        <motion.div
          className="mx-auto max-w-[1200px] px-4 sm:px-6 pb-16"
          variants={fadeUp}
        >
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3 md:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specs">Specs</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB — premium layout: shortDesc card → images */}
            {/* OVERVIEW — clean, minimal, edge-aligned images */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* short description */}
              {product?.shortDesc ? (
                <motion.div
                  variants={fadeIn}
                  className="rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 
             bg-white/80 dark:bg-neutral-900/60 backdrop-blur-sm 
             p-6 md:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] 
             transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] md:text-[20px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                      Overview
                    </h2>
                    <span className="h-1.5 w-12 rounded-full bg-gradient-to-r from-[#fcba17] to-amber-400"></span>
                  </div>

                  <p className="text-[15.5px] leading-8 text-neutral-700 dark:text-neutral-300 font-[450]">
                    {product.shortDesc}
                  </p>
                </motion.div>
              ) : null}

              {/* images (descImages preferred, productMedia fallback) */}
              {(() => {
                const imgs =
                  Array.isArray(product?.descImages) &&
                  product.descImages.length > 0
                    ? product.descImages
                    : Array.isArray(product?.productMedia)
                    ? product.productMedia
                    : [];

                if (!imgs.length) return null;

                return (
                  <section className="relative w-screen left-1/2 right-1/2 -translate-x-1/2">
                    <div className="px-1 sm:px-2 md:px-4 lg:px-6 space-y-2">
                      {imgs.map((img, i) =>
                        img?.path ? (
                          <motion.img
                            key={img?._id || i}
                            variants={fadeIn}
                            src={img.path}
                            alt={img?.alt || `overview-${i}`}
                            loading="lazy"
                            draggable={false}
                            className="block w-full h-auto object-cover rounded-xl overflow-hidden"
                          />
                        ) : (
                          <div
                            key={i}
                            className="h-[45vh] bg-muted rounded-xl overflow-hidden"
                          />
                        )
                      )}
                    </div>
                  </section>
                );
              })()}
            </TabsContent>

            <TabsContent value="specs" className="mt-6">
              {Array.isArray(product?.additionalInfo) &&
              product.additionalInfo.length > 0 ? (
                <motion.div
                  className="rounded-2xl border overflow-hidden overflow-x-auto"
                  variants={fadeIn}
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
                </motion.div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No specifications added.
                </div>
              )}
            </TabsContent>

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
          preserveScroll();
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

      {/* global styles */}
      <style jsx global>{`
        html,
        body {
          overflow-x: clip;
        }
        @supports not (overflow: clip) {
          html,
          body {
            overflow-x: hidden;
          }
        }
        :root {
          --sbw: calc(100vw - 100%);
        }
        .bleed-images {
          width: calc(100vw - var(--sbw));
          margin-left: calc(50% - ((100vw - var(--sbw)) / 2));
          margin-right: calc(50% - ((100vw - var(--sbw)) / 2));
          overflow-x: hidden;
          position: relative;
        }
        @supports (width: 100dvw) {
          .bleed-images {
            width: 100dvw;
            margin-left: calc(50% - 50dvw);
            margin-right: calc(50% - 50dvw);
          }
        }
        .bleed-images img {
          display: block;
          width: 100%;
          height: auto;
          margin: 0;
          border: 0;
          padding: 0;
          user-select: none;
          -webkit-user-drag: none;
        }
        .product-gallery .swiper,
        .product-gallery .swiper-wrapper,
        .product-gallery .swiper-slide {
          height: auto !important;
        }
        .product-gallery .slide-box {
          min-height: 200px;
        }
        .product-gallery .thumbs-row {
          padding-inline-end: 1rem;
        }
        .product-gallery .thumbs-row::after {
          content: "";
          display: block;
          flex: 0 0 14px;
        }
        .product-gallery .thumbs-row > button {
          flex: 0 0 auto;
        }
        .product-gallery .thumbs-scrollarea {
          scrollbar-gutter: stable both-edges;
        }
      `}</style>
    </motion.main>
  );
}
