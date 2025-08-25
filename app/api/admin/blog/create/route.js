import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { z } from "zod";
import slugify from "slugify";
import BlogPost from "@/models/Blog.model";

/* ───────────── Helpers ───────────── */
const stopwords = new Set([
  "the","a","an","and","or","but","for","nor","of","on","in","to","with","by",
  "at","from","is","are","be","as","it","that","this","these","those","your",
  "our","their","you","we"
]);

const blocksToPlain = (data) => {
  if (!data || !Array.isArray(data?.blocks)) return "";
  const rmTags = (s) => (s || "").replace(/<[^>]*>/g, " ");
  return data.blocks
    .map((b) => {
      switch (b.type) {
        case "paragraph": return rmTags(b.data?.text);
        case "header":    return b.data?.text || "";
        case "list":      return (b.data?.items || []).join(" ");
        case "quote":     return b.data?.text || "";
        case "table":     return (b.data?.content || []).flat().join(" ");
        case "checklist": return (b.data?.items || []).map(i => i?.text || "").join(" ");
        case "code":      return b.data?.code || "";
        default:          return "";
      }
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
};

const truncateAtWord = (s = "", max = 160) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…";
};

const toFocusKeywords = (title = "", tags = []) => {
  const base = [
    ...title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((w) => !stopwords.has(w)),
    ...tags.map((t) => t.toLowerCase().trim()).filter(Boolean),
  ];
  return Array.from(new Set(base)).slice(0, 6);
};

const normalizeImage = (img) => ({
  _id: String(img._id),
  path: String(img.path),
  alt: img.alt ? String(img.alt) : "",
});

/* Very small sanitizer: allow only these inline tags */
const sanitizeInline = (html = "") =>
  String(html)
    // keep b/strong/i/em/u/code/mark/a/br
    .replace(/<(?!\/?(b|strong|i|em|u|code|mark|a|br)\b)[^>]*>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, ""); // strip inline handlers

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function blocksToHtml(data) {
  if (!data || !Array.isArray(data.blocks)) return "";

  const parts = [];

  for (const b of data.blocks) {
    if (!b || !b.type) continue;

    switch (b.type) {
      case "header": {
        const lvl = Math.max(1, Math.min(3, Number(b.data?.level || 2)));
        const text = sanitizeInline(b.data?.text || "");
        parts.push(`<h${lvl}>${text}</h${lvl}>`);
        break;
      }
      case "paragraph": {
        const text = sanitizeInline(b.data?.text || "");
        if (text.trim()) parts.push(`<p>${text}</p>`);
        break;
      }
      case "list": {
        const style = (b.data?.style || "unordered").toLowerCase();
        const tag = style === "ordered" ? "ol" : "ul";
        const items = (b.data?.items || [])
          .map((it) => `<li>${sanitizeInline(it || "")}</li>`)
          .join("");
        parts.push(`<${tag}>${items}</${tag}>`);
        break;
      }
      case "checklist": {
        const items = (b.data?.items || [])
          .map((it) => {
            const cls = it?.checked ? "checked" : "unchecked";
            return `<li class="${cls}">${sanitizeInline(it?.text || "")}</li>`;
          })
          .join("");
        parts.push(`<ul class="checklist">${items}</ul>`);
        break;
      }
      case "quote": {
        const text = sanitizeInline(b.data?.text || "");
        const cap = sanitizeInline(b.data?.caption || "");
        parts.push(`<blockquote>${text}${cap ? `<cite>${cap}</cite>` : ""}</blockquote>`);
        break;
      }
      case "table": {
        const rows = (b.data?.content || [])
          .map((row) => `<tr>${row.map((cell) => `<td>${sanitizeInline(cell || "")}</td>`).join("")}</tr>`)
          .join("");
        parts.push(`<div class="table-wrap"><table><tbody>${rows}</tbody></table></div>`);
        break;
      }
      case "code": {
        const code = esc(b.data?.code || "");
        parts.push(`<pre><code>${code}</code></pre>`);
        break;
      }
      case "delimiter": {
        parts.push("<hr/>");
        break;
      }
      case "embed": {
        // Safer default: render as a link preview container
        const src = esc(b.data?.source || b.data?.embed || "");
        if (src) parts.push(`<div class="embed"><a href="${src}" rel="noopener nofollow" target="_blank">${src}</a></div>`);
        break;
      }
      case "image": {
        const url =
          b.data?.file?.url ||
          b.data?.url ||
          "";
        if (url) {
          const cap = sanitizeInline(b.data?.caption || "");
          parts.push(
            `<figure class="image"><img src="${esc(url)}" alt="${esc(cap)}" loading="lazy" />${
              cap ? `<figcaption>${cap}</figcaption>` : ""
            }</figure>`
          );
        }
        break;
      }
      default: {
        // ignore unknown blocks
        break;
      }
    }
  }

  return parts.join("\n");
}

/* ───────────── Zod schema ───────────── */
const payloadSchema = z.object({
  title: z.string().trim().min(3, "Title is required"),
  slug: z.string().trim().optional(), // auto from title if missing
  status: z.enum(["draft", "published"]).default("draft"),
  showOnWebsite: z.boolean().default(true),

  category: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional().default([]),

  featuredImage: z.object({
    _id: z.string(),
    path: z.string(),
    alt: z.string().optional(),
  }),

  // Editor.js
  content: z.object({
    time: z.number().optional(),
    version: z.string().optional(),
    blocks: z.array(z.any()).min(1, "Content cannot be empty"),
  }),

  // Optional explicit excerpt/seo override if you ever pass them
  excerpt: z.string().optional(),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      focusKeywords: z.array(z.string()).optional(),
      noindex: z.boolean().optional(),
      nofollow: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const raw = await req.json();
    const parsed = payloadSchema.safeParse(raw);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const data = parsed.data;

    // normalize slug
    const slug =
      data.slug && data.slug.trim().length
        ? slugify(data.slug, { lower: true, strict: true })
        : slugify(data.title, { lower: true, strict: true });

    if (!slug) return response(false, 400, "Unable to generate a valid slug");

    // unique slug check (ignore soft-deleted)
    const existing = await BlogPost.findOne({ slug, deletedAt: null }).lean();
    if (existing) return response(false, 409, "A blog post with this slug already exists");

    // normalize tags
    const tags = Array.from(new Set((data.tags || []).map((t) => t.trim()).filter(Boolean))).slice(0, 20);

    // required featured image
    const featuredImage = normalizeImage(data.featuredImage);

    // Build HTML from Editor.js blocks
    const contentHtml = blocksToHtml(data.content);
    if (!contentHtml || !contentHtml.trim()) {
      return response(false, 400, "Content is empty after conversion");
    }

    // Auto SEO + excerpt
    const plain = blocksToPlain(data.content);
    const excerpt = data.excerpt?.trim() || truncateAtWord(plain, 220);

    const metaTitle = (data.seo?.metaTitle || data.title).slice(0, 70);
    const metaDescription = (data.seo?.metaDescription || truncateAtWord(plain, 160)).slice(0, 160);
    const focusKeywords =
      data.seo?.focusKeywords && data.seo.focusKeywords.length
        ? data.seo.focusKeywords.slice(0, 8)
        : toFocusKeywords(data.title, tags);

    const doc = {
      title: data.title.trim(),
      slug,
      excerpt,
      contentHtml,                 // ✅ satisfies your model requirement
      contentRaw: data.content,    // optional raw blocks
      featuredImage,

      category: data.category || undefined,
      tags,

      status: data.status,
      showOnWebsite: !!data.showOnWebsite,
      publishedAt: data.status === "published" ? new Date() : null,

      seo: {
        metaTitle,
        metaDescription,
        focusKeywords,
        noindex: !!data.seo?.noindex,
        nofollow: !!data.seo?.nofollow,
      },
    };

    const created = await BlogPost.create(doc);
    return response(true, 201, "Blog post created successfully", created);
  } catch (error) {
    return catchError(error, "Failed to create blog post");
  }
}
