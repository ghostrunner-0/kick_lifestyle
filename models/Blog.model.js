// models/BlogPost.model.js
import mongoose from "mongoose";

/* --- Reusable image schema (matches your Product model) --- */
const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    alt: { type: String, default: "" },
    path: { type: String, required: true },
  },
  { _id: false }
);

/* --- SEO sub-schema --- */
const seoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, trim: true, maxlength: 70 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    canonicalUrl: { type: String, trim: true },

    focusKeywords: [{ type: String, trim: true, lowercase: true }],

    og: {
      title: { type: String, trim: true, maxlength: 70 },
      description: { type: String, trim: true, maxlength: 200 },
      image: imageSchema,
      type: {
        type: String,
        enum: ["article", "website"],
        default: "article",
      },
    },

    twitter: {
      card: {
        type: String,
        enum: ["summary", "summary_large_image"],
        default: "summary_large_image",
      },
      title: { type: String, trim: true, maxlength: 70 },
      description: { type: String, trim: true, maxlength: 200 },
      image: imageSchema,
    },

    noindex: { type: Boolean, default: false },
    nofollow: { type: Boolean, default: false },
  },
  { _id: false }
);

/* --- BlogPost schema --- */
const BlogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    excerpt: { type: String, trim: true, maxlength: 300 },

    // Store both rendered HTML and optional source (Markdown/Editor JSON)
    contentHtml: { type: String, required: true },
    contentRaw: { type: mongoose.Schema.Types.Mixed },

    // ✅ Featured image (required)
    featuredImage: { type: imageSchema, required: true },

    // Taxonomy / relations (optional)
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
    tags: [{ type: String, lowercase: true, trim: true, index: true }],

    // Optional author reference
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    locale: { type: String, default: "en", index: true },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },

    publishedAt: { type: Date, default: null, index: true },

    // 🔎 SEO block
    seo: { type: seoSchema, default: {} },

    // Calculated reading time (minutes)
    readingTimeMinutes: { type: Number, min: 0 },

    // Common flags (match your style)
    showOnWebsite: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

/* --- Helpers / Hooks --- */

// Build a slug from title if missing
BlogPostSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // Ensure SEO object exists
  if (!this.seo) this.seo = {};

  // Fallback meta from title/excerpt
  if (!this.seo.metaTitle) this.seo.metaTitle = this.title;
  if (!this.seo.metaDescription)
    this.seo.metaDescription = (this.excerpt || "").slice(0, 160);

  // Fallback OG/Twitter fields from meta + featured image
  this.seo.og = this.seo.og || {};
  if (!this.seo.og.title) this.seo.og.title = this.title;
  if (!this.seo.og.description)
    this.seo.og.description = this.seo.metaDescription;
  if (!this.seo.og.image && this.featuredImage)
    this.seo.og.image = this.featuredImage;

  this.seo.twitter = this.seo.twitter || {};
  if (!this.seo.twitter.title) this.seo.twitter.title = this.title;
  if (!this.seo.twitter.description)
    this.seo.twitter.description = this.seo.metaDescription;
  if (!this.seo.twitter.image && this.featuredImage)
    this.seo.twitter.image = this.featuredImage;

  // Estimate reading time (~200 wpm) from contentHtml
  const html = this.contentHtml || "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  this.readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  next();
});

/* --- Indexes (SEO & retrieval) --- */
// Weighted full-text search over title/excerpt/content
BlogPostSchema.index(
  { title: "text", excerpt: "text", contentHtml: "text" },
  { name: "BlogTextIndex", weights: { title: 5, excerpt: 3, contentHtml: 1 } }
);

// Useful compound indexes
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ "seo.focusKeywords": 1 });

export default mongoose.models.BlogPost ||
  mongoose.model("BlogPost", BlogPostSchema, "BlogPosts");
