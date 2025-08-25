// components/blog/ArticleClient.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Share2, Link as LinkIcon, ArrowUp } from "lucide-react";
import { showToast } from "@/lib/ShowToast";

const cn = (...a) => a.filter(Boolean).join(" ");

/* ───────── Editor.js → HTML (handles nested lists) ───────── */

function sanitize(html = "") {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "");
}

function renderListItems(items, ordered = false) {
  if (!Array.isArray(items)) return "";
  const tag = ordered ? "ol" : "ul";

  const renderNode = (node) => {
    // node: string | { content: string, items?: [] }
    if (typeof node === "string") return `<li>${node}</li>`;
    const text = typeof node?.content === "string" ? node.content : "";
    const children =
      Array.isArray(node?.items) && node.items.length
        ? `<${tag}>${node.items.map(renderNode).join("")}</${tag}>`
        : "";
    return `<li>${text}${children}</li>`;
  };

  return `<${tag}>${items.map(renderNode).join("")}</${tag}>`;
}

function editorJsToHtml(raw) {
  if (!raw || !Array.isArray(raw.blocks)) return "";
  const out = [];

  for (const b of raw.blocks) {
    const d = b?.data || {};
    switch (b.type) {
      case "header": {
        const lvl = Math.min(Math.max(parseInt(d.level || 2, 10), 1), 6);
        out.push(`<h${lvl}>${d.text || ""}</h${lvl}>`);
        break;
      }
      case "paragraph":
        out.push(`<p>${d.text || ""}</p>`);
        break;

      case "list": {
        const ordered = d.style === "ordered";
        out.push(renderListItems(d.items || [], ordered));
        break;
      }

      case "checklist": {
        const items = Array.isArray(d.items) ? d.items : [];
        const lis = items
          .map(
            (it) =>
              `<li class="cdx-checklist-item">
                <span class="cdx-check ${it.checked ? "checked" : ""}"></span>
                <span>${it.text || it?.content || ""}</span>
              </li>`
          )
          .join("");
        out.push(`<ul class="cdx-checklist">${lis}</ul>`);
        break;
      }

      case "image": {
        const url = d?.file?.url || d?.url;
        const cap = d?.caption || "";
        if (url) {
          out.push(
            `<figure class="image">
              <img src="${url}" alt="${cap}" />
              ${cap ? `<figcaption>${cap}</figcaption>` : ""}
            </figure>`
          );
        }
        break;
      }

      case "quote": {
        const txt = d?.text || "";
        const caption = d?.caption ? `<cite>— ${d.caption}</cite>` : "";
        out.push(`<blockquote><p>${txt}</p>${caption}</blockquote>`);
        break;
      }

      case "table": {
        const rows = Array.isArray(d?.content) ? d.content : [];
        const trs = rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
          )
          .join("");
        out.push(`<table><tbody>${trs}</tbody></table>`);
        break;
      }

      case "code": {
        const code = d?.code || "";
        out.push(
          `<pre class="code"><code>${code.replace(/</g, "&lt;")}</code></pre>`
        );
        break;
      }

      case "delimiter":
        out.push(`<div class="delimiter" aria-hidden="true">***</div>`);
        break;

      case "embed": {
        const src = d?.embed || d?.source || "";
        const cap = d?.caption || "Embed";
        if (!src) break;
        out.push(`
          <div class="embed-wrap">
            <iframe
              src="${src}"
              title="${cap}"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          </div>
        `);
        break;
      }

      default:
        // unknown tools ignored silently
        break;
    }
  }

  return sanitize(out.join("\n"));
}

/* ───────── Component ───────── */
export default function ArticleClient({
  content,
  fallbackHtml = "",
  tags = [],
  title,
}) {
  const prefersReduced = useReducedMotion();
  const articleRef = useRef(null);

  const [showTop, setShowTop] = useState(false);
  const [html, setHtml] = useState("");

  // Build HTML on the client from Editor.js blocks (or fallback HTML)
  useEffect(() => {
    if (content && Array.isArray(content.blocks)) {
      setHtml(editorJsToHtml(content));
    } else if (fallbackHtml) {
      setHtml(sanitize(fallbackHtml));
    } else {
      setHtml("");
    }
  }, [content, fallbackHtml]);

  // back-to-top toggle
  useEffect(() => {
    const onScroll = () => {
      if (!articleRef.current) return;
      const elTop = articleRef.current.offsetTop || 0;
      const scrolled = window.scrollY - elTop;
      setShowTop(scrolled > 500);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // share/copy
  const shareData = useMemo(
    () => ({
      title:
        title || (typeof document !== "undefined" ? document.title : "Article"),
      text: title || "Check out this article",
      url: typeof window !== "undefined" ? window.location.href : "",
    }),
    [title]
  );

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showToast("success", "Link copied to clipboard.");
      }
    } catch {
      showToast("error", "Couldn’t share the link.");
    }
  };
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      showToast("success", "Link copied to clipboard.");
    } catch {
      showToast("error", "Copy failed. Try again.");
    }
  };
  const backToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // subtle motion
  const container = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: "easeOut", when: "beforeChildren" },
    },
  };

  return (
    <TooltipProvider>
      <motion.section
        variants={container}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-6"
      >
        {/* top actions (quiet) */}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </TooltipTrigger>
            <TooltipContent>Native share / copy URL</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onCopy}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Copy link
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy the article URL</TooltipContent>
          </Tooltip>
        </div>

        {/* content — minimal, wider (95ch cap for readability) */}
        <article
          ref={articleRef}
          className={cn(
            "prose lg:prose-lg dark:prose-invert max-w-[95ch]",
            "prose-img:rounded-xl",
            "prose-h1:font-semibold prose-h2:font-semibold prose-h3:font-medium",
            "prose-ul:list-disc prose-ol:list-decimal",
            "prose-li:marker:opacity-80",
            "prose-a:underline-offset-4 hover:prose-a:underline"
          )}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* tags + bottom actions */}
        {(Array.isArray(tags) && tags.length > 0) || true ? (
          <div className="mt-10 flex max-w-[95ch] flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
            {Array.isArray(tags) && tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((t, i) => (
                  <Badge
                    key={`${t}-${i}`}
                    variant="secondary"
                    className="rounded-full"
                  >
                    {String(t)}
                  </Badge>
                ))}
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={onCopy}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        ) : null}
      </motion.section>

      {/* back to top */}
      {showTop && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            size="icon"
            className="rounded-full shadow-lg"
            onClick={backToTop}
            aria-label="Back to top"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* light styles for embeds/checklist/code/table */}
      <style jsx global>{`
        .embed-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border-radius: 0.75rem;
        }
        .embed-wrap iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
        .cdx-checklist {
          list-style: none;
          padding-left: 0;
        }
        .cdx-checklist-item {
          display: flex;
          gap: 0.5rem;
          align-items: baseline;
          margin: 0.25rem 0;
        }
        .cdx-check {
          display: inline-block;
          width: 0.9rem;
          height: 0.9rem;
          border-radius: 0.25rem;
          border: 1px solid color-mix(in oklab, currentColor 45%, transparent);
          margin-top: 0.2rem;
        }
        .cdx-check.checked {
          background: color-mix(in oklab, currentColor 18%, transparent);
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          overflow: hidden;
          border-radius: 0.5rem;
        }
        .prose table td,
        .prose table th {
          border: 1px solid color-mix(in oklab, currentColor 20%, transparent);
          padding: 0.5rem 0.75rem;
        }
        .prose pre.code {
          background: color-mix(in oklab, currentColor 8%, transparent);
          padding: 0.9rem 1rem;
          border-radius: 0.75rem;
          overflow: auto;
        }
      `}</style>
    </TooltipProvider>
  );
}
