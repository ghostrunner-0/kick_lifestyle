// app/(root)/(website)/blogs/[slug]/page.jsx
import axios from "axios";
import Image from "next/image"; // (kept for type safety if needed later)
import Link from "next/link";
import ArticleHero from "./ArticleHero";
import ArticleClient from "./ClientArticle";

export const dynamic = "force-static";
export const revalidate = 300;

const apiBase = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/* ───────── Editor.js helpers (meta & fallbacks) ───────── */
const hasBrokenObjects = (s = "") => /\[object Object]/i.test(s);

function blocksToPlain(raw) {
  if (!raw || !Array.isArray(raw.blocks)) return "";
  const rm = (s = "") => (s || "").replace(/<[^>]*>/g, " ");
  const flatList = (items) => {
    if (!Array.isArray(items)) return [];
    const acc = [];
    for (const it of items) {
      if (typeof it === "string") acc.push(it);
      else if (it && typeof it === "object") {
        if (it.content) acc.push(it.content);
        if (Array.isArray(it.items) && it.items.length) {
          acc.push(...flatList(it.items));
        }
      }
    }
    return acc;
  };

  return raw.blocks
    .map((b) => {
      const d = b?.data || {};
      switch (b.type) {
        case "paragraph":
          return rm(d.text);
        case "header":
          return d.text || "";
        case "list":
          return flatList(d.items).join(" ");
        case "quote":
          return d.text || "";
        case "table":
          return (d.content || []).flat().join(" ");
        default:
          return "";
      }
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ───────── Fetch ───────── */
async function fetchPost(slug) {
  const url = `${apiBase()}/api/website/blogs/${encodeURIComponent(slug)}`;
  const { data } = await axios.get(url, {
    headers: { "Content-Type": "application/json" },
  });
  if (!data?.success || !data?.data) return null;
  return data.data;
}

/* ───────── Metadata ───────── */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: "Article not found", robots: { index: false } };

  const blocks =
    (post.content && Array.isArray(post.content.blocks) && post.content) ||
    (post.contentRaw && Array.isArray(post.contentRaw.blocks) && post.contentRaw) ||
    null;

  const summary =
    post.excerpt && !hasBrokenObjects(post.excerpt)
      ? post.excerpt
      : blocks
      ? blocksToPlain(blocks).slice(0, 160)
      : String(post.contentHtml || "").replace(/<[^>]+>/g, " ").slice(0, 160);

  const title = post.seo?.metaTitle || post.title;
  const description =
    post.seo?.metaDescription && !hasBrokenObjects(post.seo?.metaDescription)
      ? post.seo.metaDescription
      : summary;

  const ogImage = post.seo?.og?.image?.path || post.featuredImage?.path || "";
  const canonical = `${apiBase()}/blogs/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: post.seo?.og?.type || "article",
      title: post.seo?.og?.title || title,
      description: post.seo?.og?.description || description,
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: post.seo?.twitter?.card || "summary_large_image",
      title: post.seo?.twitter?.title || title,
      description: post.seo?.twitter?.description || description,
      images: post.seo?.twitter?.image?.path
        ? [post.seo.twitter.image.path]
        : ogImage
        ? [ogImage]
        : [],
    },
    robots: { index: !post.seo?.noindex, follow: !post.seo?.nofollow },
  };
}

/* ───────── Page ───────── */
export default async function Page({ params }) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post || post.status !== "published" || post.showOnWebsite === false) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Article not found</h1>
        <p className="mt-2 text-muted-foreground">This post is unavailable.</p>
      </div>
    );
  }

  // Prefer new admin payload `content`; else `contentRaw`; else HTML
  const blocks =
    (post.content && Array.isArray(post.content.blocks) && post.content) ||
    (post.contentRaw && Array.isArray(post.contentRaw.blocks) && post.contentRaw) ||
    null;

  const fallbackHtml =
    !blocks && post.contentHtml && !hasBrokenObjects(post.contentHtml)
      ? post.contentHtml
      : "";

  const cover = post.featuredImage?.path || "";

  return (
    <div className="relative">
      <ArticleHero
        cover={cover}
        alt={post.featuredImage?.alt || post.title}
        title={post.title}
        publishedAt={post.publishedAt}
        readingTime={post.readingTimeMinutes || 1}
      />

      <ArticleClient
        content={blocks}
        fallbackHtml={fallbackHtml}
        title={post.title}
        tags={post.tags}
      />
    </div>
  );
}
