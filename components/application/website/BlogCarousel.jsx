"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

/* utils */
const clean = (s) =>
  String(s ?? "")
    .replace(/\[object Object\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

/* tiny skeleton */
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/50 overflow-hidden">
      <div className="aspect-[16/10] bg-neutral-200/70 dark:bg-neutral-800/60 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-neutral-200/80 dark:bg-neutral-800/70 rounded" />
        <div className="h-3 w-2/3 bg-neutral-200/70 dark:bg-neutral-800/60 rounded" />
      </div>
    </div>
  );
}

/* compact blog card */
function BlogCard({ post }) {
  const href = `/blogs/${encodeURIComponent(post.slug)}`;
  const title = post.title || "Untitled";
  const excerpt = clean(post.excerpt).slice(0, 110);
  const img = post.featuredImage?.path || "";
  const alt = post.featuredImage?.alt || title;

  return (
    <article
      className="
        group rounded-xl overflow-hidden
        border border-neutral-200/70 dark:border-neutral-800
        bg-white dark:bg-neutral-950
        hover:border-[#fcba17]/40 transition-colors
      "
    >
      <Link href={href} className="block">
        <div className="relative aspect-[16/10]">
          {img ? (
            <Image
              src={img}
              alt={alt}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={false}
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900" />
          )}
        </div>
      </Link>

      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {fmtDate(post.publishedAt) && (
            <span>{fmtDate(post.publishedAt)}</span>
          )}
          {post.readingTimeMinutes ? (
            <span>• {post.readingTimeMinutes} min</span>
          ) : null}
        </div>

        <h3 className="mt-1 text-[15px] font-semibold leading-snug line-clamp-2">
          <Link href={href}>{title}</Link>
        </h3>

        {excerpt ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300 line-clamp-2">
            {excerpt}
          </p>
        ) : null}

        <div className="mt-2">
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7c5a00] dark:text-[#ffd36a]"
          >
            Read
            <span className="h-[2px] w-4 bg-[#fcba17] inline-block" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function BlogCarouselMinimal({
  title = "From the Blog",
  page = 1,
  limit = 12,
  className = "",
}) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [err, setErr] = useState("");

  // fetch posts
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(
          `/api/website/blogs?page=${page}&limit=${limit}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!json?.success)
          throw new Error(json?.message || "Failed to load blogs");
        if (!cancel) setPosts(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Network error");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [page, limit]);

  const items = useMemo(() => posts || [], [posts]);

  // embla
  const autoplay = useRef(
    Autoplay({ delay: 3200, stopOnMouseEnter: true, stopOnInteraction: false })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      skipSnaps: false,
      containScroll: "trimSnaps",
      dragFree: false,
    },
    [autoplay.current]
  );

  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setSnaps(emblaApi.scrollSnapList());
      onSelect();
    });
  }, [emblaApi, onSelect]);

  const prev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const to = useCallback((i) => emblaApi && emblaApi.scrollTo(i), [emblaApi]);

  if (!loading && !items.length) return null;

  return (
    <section className={"py-8 " + className}>
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 2xl:px-16">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {title}
            </h2>
            <div className="mt-2 h-[3px] w-20 rounded bg-[#fcba17]" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="h-8 w-8 rounded-full border border-neutral-200 dark:border-neutral-800 grid place-items-center hover:bg-neutral-50 dark:hover:bg-neutral-900"
              aria-label="Previous"
              type="button"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a.997.997 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" />
              </svg>
            </button>
            <button
              onClick={next}
              className="h-8 w-8 rounded-full border border-neutral-200 dark:border-neutral-800 grid place-items-center hover:bg-neutral-50 dark:hover:bg-neutral-900"
              aria-label="Next"
              type="button"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path d="M7.293 4.293a1 1 0 011.414 0L13.707 9.293a.997.997 0 010 1.414L8.707 15.707a1 1 0 11-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>
        </div>

        {err ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : (
          <div className="relative">
            {/* subtle edge fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent dark:from-neutral-950 z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent dark:from-neutral-950 z-10" />

            <div ref={emblaRef} className="overflow-hidden">
              <div className="flex gap-4">
                {(loading ? Array.from({ length: 6 }) : items).map(
                  (post, i) => (
                    <div
                      key={i}
                      className="
                      flex-[0_0_88%] sm:flex-[0_0_48%] md:flex-[0_0_38%] lg:flex-[0_0_30%]
                    "
                    >
                      {loading ? <SkeletonCard /> : <BlogCard post={post} />}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* dots */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {snaps.map((_, i) => {
                const active = i === selected;
                return (
                  <button
                    key={i}
                    onClick={() => to(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    type="button"
                    className={[
                      "h-2.5 rounded-full transition-all",
                      active
                        ? "w-5 bg-[#fcba17]"
                        : "w-2.5 bg-neutral-300 dark:bg-neutral-700",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
