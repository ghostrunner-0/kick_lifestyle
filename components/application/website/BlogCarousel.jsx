"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Productcaresousel from "./Productcaresousel";
import { Button } from "@/components/ui/button";

/** helpers */
const clean = (s) =>
  String(s || "")
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

/** skeleton card */
const Skeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-neutral-800 bg-slate-100 animate-pulse">
    <div className="aspect-[16/9] bg-slate-200" />
    <div className="p-4 space-y-3">
      <div className="h-5 w-3/4 bg-slate-200 rounded" />
      <div className="h-4 w-2/3 bg-slate-200 rounded" />
      <div className="h-9 w-32 bg-slate-200 rounded-full" />
    </div>
  </div>
);

/** small blog card */
function BlogCard({ post }) {
  const href = `/blogs/${encodeURIComponent(post.slug)}`;
  const title = post.title || "Untitled";
  const excerpt = clean(post.excerpt).slice(0, 140);
  const img = post.featuredImage?.path || "";
  const alt = post.featuredImage?.alt || title;

  return (
    <article className="h-full overflow-hidden rounded-2xl border border-slate-200/60 dark:border-neutral-800 bg-white">
      {/* image */}
      <Link href={href} className="block">
        <div className="relative aspect-[16/9]">
          {img ? (
            <Image
              src={img}
              alt={alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
              priority={false}
            />
          ) : (
            <div className="absolute inset-0 bg-slate-100" />
          )}
        </div>
      </Link>

      {/* content */}
      <div className="p-4 space-y-2">
        <div className="text-xs text-muted-foreground">
          {fmtDate(post.publishedAt)} {post.readingTimeMinutes ? `• ${post.readingTimeMinutes} min read` : ""}
        </div>
        <h3 className="text-base font-semibold leading-snug line-clamp-2">
          <Link href={href}>{title}</Link>
        </h3>
        {excerpt ? (
          <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
        ) : null}

        <div className="pt-2">
          <Button asChild size="sm" className="rounded-full">
            <Link href={href}>Read more</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

/** main carousel */
export default function BlogCarousel({ title = "From the Blog", page = 1, limit = 12, className = "" }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`/api/website/blogs?page=${page}&limit=${limit}`, {
          method: "GET",
          cache: "no-store",
        });
        const json = await res.json();
        if (!json?.success) throw new Error(json?.message || "Failed to load blogs");
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

  if (!loading && !items.length) return null;

  return (
    <section className={"py-8 " + className}>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h2>
        </div>

        {err ? (
          <div className="text-sm text-red-600">{err}</div>
        ) : (
          <Productcaresousel
            items={items}
            loading={loading}
            skeletonCount={6}
            // same visual spacing & column logic as products
            itemBasisClass="basis-full sm:basis-1/2 md:basis-1/3 xl:basis-1/4"
            renderItem={(post) => <BlogCard post={post} />}
            Skeleton={Skeleton}
          />
        )}
      </div>
    </section>
  );
}
