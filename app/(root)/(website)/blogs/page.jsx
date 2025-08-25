"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/* Kick components */
import TitleCard from "@/components/application/TitleCard";

/* ─────────────────────────────────────────────── */
/* Config */
const PRIMARY = "#fcba17";

/* Data helpers */
const fetchBlogs = async ({ page = 1, limit = 12 } = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  const res = await fetch(`/api/website/blogs?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch blogs");
  return res.json();
};

const formatDate = (iso) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

const cleanText = (t) =>
  (t || "")
    .replace(/\[object Object]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* ─────────────────────────────────────────────── */
/* Skeletons */
const CardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:flex md:flex-col">
    <div className="relative hidden w-full md:block">
      <Skeleton className="aspect-[16/9] w-full" />
    </div>
    <div className="flex gap-3 p-3 md:block">
      <Skeleton className="h-[96px] w-[120px] rounded-md md:hidden" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────── */
/* Motion presets */
const useGridMotion = () => {
  const prefersReduced = useReducedMotion();
  return {
    container: {
      hidden: { opacity: 0, y: prefersReduced ? 0 : 6 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.4,
          ease: "easeOut",
          when: "beforeChildren",
          staggerChildren: prefersReduced ? 0 : 0.06,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: prefersReduced ? 0 : 12, scale: prefersReduced ? 1 : 0.98 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.45, ease: "easeOut" },
      },
    },
  };
};

/* ─────────────────────────────────────────────── */
/* Card */
function ArticleCard({ post, idx }) {
  const href = `/blogs/${post.slug}`;
  const img = post?.featuredImage?.path || "/placeholder.png";
  const date = formatDate(post?.publishedAt);
  const rt = post?.readingTimeMinutes || 1;
  const category = post?.category?.name;
  const excerpt = cleanText(post.excerpt || post?.seo?.metaDescription || "");

  return (
    <motion.article
      layout
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: 12 }}
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" } },
      }}
      className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <Link href={href} className="block">
        {/* Mobile horizontal */}
        <div className="flex gap-3 p-3 md:hidden">
          <div className="relative h-[96px] w-[120px] shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-neutral-950">
            <Image
              src={img}
              alt={post.title || "Post"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 120px"
              priority={idx < 3}
            />
          </div>
          <div className="min-w-0 flex-1">
            {category && (
              <span className="mb-1 inline-block text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                {category}
              </span>
            )}
            <h3 className="line-clamp-2 text-[15px] font-semibold text-slate-900 group-hover:underline dark:text-white">
              {post.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-[12px] text-slate-600 dark:text-neutral-300">
              {excerpt}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {date && <span>{date}</span>}
              <span>·</span>
              <span>{rt} min read</span>
            </div>
          </div>
        </div>

        {/* Desktop vertical with parallax-ish hover */}
        <div className="relative hidden md:block">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-neutral-950">
            <motion.div
              className="absolute inset-0"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <Image
                src={img}
                alt={post.title || "Post"}
                fill
                className="object-cover"
                sizes="(max-width:1024px) 50vw, 33vw"
                priority={idx < 3}
              />
            </motion.div>

            {/* top-left category chip */}
            {category && (
              <div className="absolute left-3 top-3 z-10">
                <Badge
                  variant="outline"
                  className="rounded-full border-white/40 bg-white/90 text-xs font-medium text-slate-800 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-white"
                >
                  {category}
                </Badge>
              </div>
            )}

            {/* subtle gradient at bottom to boost legibility */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          <div className="space-y-1.5 p-3">
            <h3 className="line-clamp-2 text-[15px] font-semibold tracking-tight text-slate-900 group-hover:underline dark:text-white">
              {post.title}
            </h3>
            <p className="line-clamp-2 text-[13px] text-slate-600 dark:text-neutral-300">
              {excerpt}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {date && <span>{date}</span>}
              <span>·</span>
              <span>{rt} min read</span>
              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <>
                  <span>·</span>
                  <div className="flex max-w-[50%] flex-wrap gap-1">
                    {post.tags.slice(0, 2).map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                      >
                        #{t}
                      </Badge>
                    ))}
                    {post.tags.length > 2 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{post.tags.length - 2}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

/* ─────────────────────────────────────────────── */
export default function Page() {
  const [items, setItems] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");

  const sentinelRef = React.useRef(null);
  const prefersReduced = useReducedMotion();
  const { container, item } = useGridMotion();

  const load = React.useCallback(
    async ({ reset = false, pageOverride } = {}) => {
      try {
        setError("");
        if (reset) setLoading(true);
        const currentPage = pageOverride ?? (reset ? 1 : page);
        const json = await fetchBlogs({ page: currentPage, limit: 12 });
        const data = Array.isArray(json?.data) ? json.data : [];
        if (reset) setItems(data);
        else setItems((prev) => [...prev, ...data]);
        setPage(json.page || currentPage);
        setTotalPages(json.totalPages || 1);
      } catch (e) {
        setError(e?.message || "Something went wrong");
      } finally {
        if (reset) setLoading(false);
      }
    },
    [page]
  );

  React.useEffect(() => {
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      async (entries) => {
        const e = entries[0];
        if (e.isIntersecting && !loading && !loadingMore && page < totalPages) {
          try {
            setLoadingMore(true);
            await load({ pageOverride: page + 1 });
          } finally {
            setLoadingMore(false);
          }
        }
      },
      { rootMargin: "400px 0px 400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading, loadingMore, page, totalPages, load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <TitleCard
        title="Kick Blog"
        subtitle="Quick reads, real insights—no clutter. New drops, product deep-dives, and behind-the-scenes from the team."
        badge="Latest"
        accent={PRIMARY}
        variant="solid"      /* try: "solid" | "glass" | "image" */
        pattern="grid"      /* try: "dots" | "none" */
        align="center"
        size="md"
        className="mb-6"
      />

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
          {error}{" "}
          <Button variant="link" className="px-1" onClick={() => load({ reset: true })}>
            Retry
          </Button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground dark:border-neutral-800">
          No posts found.
        </div>
      ) : (
        <>
          {/* Animated grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))]"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((post, idx) => (
                <motion.div key={post._id || post.slug || idx} variants={item} layout>
                  <ArticleCard post={post} idx={idx} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-10 w-full" />

          {/* Manual fallback */}
          {!loadingMore && page < totalPages && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    setLoadingMore(true);
                    await load({ pageOverride: page + 1 });
                  } finally {
                    setLoadingMore(false);
                  }
                }}
              >
                Load more
              </Button>
            </div>
          )}

          {loadingMore && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={`more-${i}`} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
