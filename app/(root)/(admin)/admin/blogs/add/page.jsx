// app/(root)/(admin)/admin/blogs/add/page.jsx
"use client";

import React from "react";
import axios from "axios";
import slugify from "slugify";

/* shadcn/ui bits */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Switch } from "@/components/ui/switch";
import BreadCrumb from "@/components/application/admin/BreadCrumb";
import MediaSelector from "@/components/application/admin/MediaSelector";
import { showToast } from "@/lib/ShowToast";

/* ─────────────────────────────────────────────── */
/* Helpers */
const BreadCrumbData = [
  { href: "/admin", label: "Home" },
  { href: "/admin/blogs", label: "Blogs" },
  { href: "", label: "Create" },
];

const stopwords = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "for",
  "nor",
  "of",
  "on",
  "in",
  "to",
  "with",
  "by",
  "at",
  "from",
  "is",
  "are",
  "be",
  "as",
  "it",
  "that",
  "this",
  "these",
  "those",
  "your",
  "our",
  "their",
  "you",
  "we",
]);

const blocksToPlain = (data) => {
  if (!data || !Array.isArray(data?.blocks)) return "";
  const rmTags = (s) => (s || "").replace(/<[^>]*>/g, " ");
  return data.blocks
    .map((b) => {
      switch (b.type) {
        case "paragraph":
          return rmTags(b.data?.text);
        case "header":
          return b.data?.text || "";
        case "list":
          return (b.data?.items || []).join(" ");
        case "quote":
          return b.data?.text || "";
        case "table":
          return (b.data?.content || []).flat().join(" ");
        default:
          return "";
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
    ...tags.map((t) => t.toLowerCase()),
  ];
  return Array.from(new Set(base)).slice(0, 6);
};

/* ─────────────────────────────────────────────── */
/* Block Editor (Editor.js) – stable init + safe SSR */
function BlockEditor({ initialData, onChange, onReady }) {
  const holderRef = React.useRef(null);
  const editorRef = React.useRef(null);

  // keep latest handlers in refs (so init effect can be stable)
  const onChangeRef = React.useRef(onChange);
  const onReadyRef = React.useRef(onReady);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  React.useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // track last value we emitted to parent to avoid render loops
  const lastEmittedJsonRef = React.useRef(
    JSON.stringify(initialData || { blocks: [] })
  );
  const firstRenderRef = React.useRef(true);

  // 1) INIT ONCE
  React.useEffect(() => {
    let alive = true;

    (async () => {
      const EditorJS = (await import("@editorjs/editorjs")).default;
      const Header = (await import("@editorjs/header")).default;
      const List = (await import("@editorjs/list")).default;
      const ImageTool = (await import("@editorjs/image")).default;
      const Quote = (await import("@editorjs/quote")).default;
      const Embed = (await import("@editorjs/embed")).default;
      const Table = (await import("@editorjs/table")).default;

      // Optional tools – load only if installed
      let Checklist, Code, Delimiter;
      try {
        Checklist = (await import("@editorjs/checklist")).default;
      } catch {}
      try {
        Code = (await import("@editorjs/code")).default;
      } catch {}
      try {
        Delimiter = (await import("@editorjs/delimiter")).default;
      } catch {}

      if (!alive) return;

      const editor = new EditorJS({
        holder: holderRef.current,
        autofocus: false,
        placeholder: "Write your post…",
        minHeight: 0,
        data: initialData || { blocks: [] },
        tools: {
          header: {
            class: Header,
            inlineToolbar: ["bold", "italic"],
            config: { levels: [1, 2, 3], defaultLevel: 2 },
          },
          list: { class: List, inlineToolbar: true },
          ...(Checklist ? { checklist: { class: Checklist, inlineToolbar: true } } : {}),
          quote: { class: Quote, inlineToolbar: true },
          table: { class: Table, inlineToolbar: true },
          ...(Code ? { code: { class: Code } } : {}),
          ...(Delimiter ? { delimiter: { class: Delimiter } } : {}),
          embed: {
            class: Embed,
            config: { services: { youtube: true, twitter: true } },
          },
          image: {
            class: ImageTool,
            config: {
              uploader: {
                uploadByFile: async (file) => {
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/upload", {
                      method: "POST",
                      body: fd,
                    });
                    const json = await res.json();
                    if (json?.url) return { success: 1, file: { url: json.url } };
                  } catch {}
                  // fallback base64
                  const b64 = await new Promise((resolve) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result);
                    r.readAsDataURL(file);
                  });
                  return { success: 1, file: { url: b64 } };
                },
              },
            },
          },
        },
        onChange: async () => {
          const data = await editor.saver.save();
          // remember what we emitted so parent updates won't bounce back in
          lastEmittedJsonRef.current = JSON.stringify(data);
          onChangeRef.current?.(data);
        },
      });

      editorRef.current = editor;

      // expose helpers
      onReadyRef.current?.({
        insertImage: (url) => {
          editor.blocks.insert(
            "image",
            { file: { url } },
            undefined,
            undefined,
            false
          );
        },
      });
    })();

    return () => {
      alive = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // ⬇️ IMPORTANT: no deps → init once
  }, []);

  // 2) If parent *externally* replaces initialData (e.g., after reset/load),
  //    re-render the editor ONLY if it's different from what we already emitted.
  const initialDataJson = React.useMemo(
    () => JSON.stringify(initialData || { blocks: [] }),
    [initialData]
  );

  React.useEffect(() => {
    if (!editorRef.current) return;

    // Skip the very first effect run (already rendered during init)
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    // If the new value equals what we already sent up in onChange, ignore.
    if (initialDataJson === lastEmittedJsonRef.current) return;

    // Otherwise, render the external content.
    try {
      editorRef.current.render(initialData || { blocks: [] });
    } catch {
      // no-op
    }
  }, [initialDataJson, initialData]);

  return (
    <div
      ref={holderRef}
      className="min-h-[60vh] rounded-b-lg border-t bg-white p-3 dark:bg-neutral-900"
    />
  );
}

/* ─────────────────────────────────────────────── */
export default function BlogCreatePage() {
  const [mounted, setMounted] = React.useState(false);

  // Main state
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [visible, setVisible] = React.useState(true);
  const [category, setCategory] = React.useState("");
  const [tagsCsv, setTagsCsv] = React.useState("");
  const [categories, setCategories] = React.useState([]);
  const [featured, setFeatured] = React.useState(null); // {_id, path, alt}
  const [editorData, setEditorData] = React.useState({ blocks: [] });

  // Editor helpers exposed from BlockEditor
  const insertImageRef = React.useRef(null);

  React.useEffect(() => setMounted(true), []);

  // Load categories
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/category/");
        const items = Array.isArray(data?.data) ? data.data : data;
        setCategories(items || []);
      } catch {}
    })();
  }, []);

  // Auto slug
  React.useEffect(() => {
    setSlug(title.trim() ? slugify(title, { lower: true, strict: true }) : "");
  }, [title]);

  // Reading time
  const readingTime = React.useMemo(() => {
    const words = blocksToPlain(editorData).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [editorData]);

  const handleSave = async () => {
    try {
      if (!title.trim()) return showToast("warning", "Title is required");
      if (!featured)
        return showToast("warning", "Please select a featured image");
      if (!editorData?.blocks?.length)
        return showToast("warning", "Write some content");

      const tags = tagsCsv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Auto SEO
      const plain = blocksToPlain(editorData);
      const metaTitle = title.trim().slice(0, 70);
      const metaDescription = truncateAtWord(plain, 160);
      const focusKeywords = toFocusKeywords(title, tags);

      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        status,
        showOnWebsite: visible,
        category: category || undefined,
        tags,
        featuredImage: featured
          ? {
              _id: featured._id,
              path: featured.path,
              alt: featured.alt || "",
            }
          : undefined,
        // Store Editor.js blocks
        content: editorData,
        seo: {
          metaTitle,
          metaDescription,
          focusKeywords,
          noindex: false,
          nofollow: false,
        },
      };

      const { data: res } = await axios.post("/api/admin/blog/create", payload);
      if (!res?.success)
        throw new Error(res?.message || "Failed to create post");

      showToast("success", "Blog post created!");
      // Reset (this will also update editor via our external-change effect)
      setTitle("");
      setSlug("");
      setStatus("draft");
      setVisible(true);
      setCategory("");
      setTagsCsv("");
      setFeatured(null);
      setEditorData({ blocks: [] });
    } catch (e) {
      showToast("error", e?.message || "Something went wrong");
    }
  };

  return (
    <div className="space-y-4">
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[84vh] rounded-lg border bg-background"
      >
        {/* LEFT: Elementor-like control panel */}
        <ResizablePanel
          defaultSize={32}
          minSize={24}
          maxSize={44}
          className="border-r"
        >
          <div className="flex h-full flex-col">
            <div className="border-b px-3 py-3">
              <h3 className="text-sm font-semibold leading-tight">Editor Panel</h3>
            </div>

            <Tabs defaultValue="content" className="flex flex-1 flex-col">
              <div className="px-3 pt-3">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
              </div>

              {/* Content tab */}
              <TabsContent value="content" className="flex-1 overflow-auto px-3 pb-4">
                <Accordion type="single" collapsible defaultValue="text">
                  <AccordionItem value="text">
                    <AccordionTrigger className="text-sm font-medium">
                      Text Editor
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {/* Title + Slug */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Title
                        </label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Post title…"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Slug
                        </label>
                        <Input
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          placeholder="auto-generated"
                        />
                      </div>

                      {/* Quick helpers */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => showToast("info", "Use editor toolbar/tools")}
                        >
                          <strong>B</strong>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            insertImageRef.current
                              ? showToast("info", "Use the Featured → Insert button")
                              : null
                          }
                        >
                          Image
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            showToast("info", "Use the Embed tool inside the editor")
                          }
                        >
                          Embed
                        </Button>
                      </div>

                      {/* Featured image picker */}
                      <div className="space-y-2 rounded-md border p-3">
                        <div className="text-xs font-medium text-muted-foreground">
                          Featured Image
                        </div>
                        <MediaSelector
                          multiple={false}
                          triggerLabel={
                            featured
                              ? "Change Featured Image"
                              : "Select Featured Image"
                          }
                          onSelect={(file) => {
                            if (!file) return setFeatured(null);
                            const img = {
                              _id: file._id,
                              path: file.path,
                              alt: file.alt || "",
                            };
                            setFeatured(img);
                          }}
                        />
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            Also insert into content
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (featured?.path && insertImageRef.current) {
                                insertImageRef.current(featured.path);
                              }
                            }}
                            disabled={!featured}
                          >
                            Insert to Editor
                          </Button>
                        </div>
                      </div>

                      {/* Publish box */}
                      <div className="space-y-3 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Status</span>
                          <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Visible</span>
                          <Switch checked={visible} onCheckedChange={setVisible} />
                        </div>
                        <Button className="w-full" onClick={handleSave}>
                          {status === "published" ? "Publish" : "Save Draft"}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="tax">
                    <AccordionTrigger className="text-sm font-medium">
                      Categories & Tags
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Category
                        </label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {(categories || []).map((c) => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Tags (comma separated)
                        </label>
                        <Input
                          value={tagsCsv}
                          onChange={(e) => setTagsCsv(e.target.value)}
                          placeholder="seo, tips, phones"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* Style tab */}
              <TabsContent value="style" className="px-3 pb-4">
                <Card>
                  <CardContent className="p-3 text-sm text-muted-foreground">
                    Add typography and spacing controls here if you need granular
                    styling.
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Advanced tab */}
              <TabsContent value="advanced" className="px-3 pb-4">
                <Card>
                  <CardContent className="p-3 text-sm text-muted-foreground">
                    Custom attributes, classes, etc.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        {/* RIGHT: Canvas */}
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={68} minSize={40}>
          <div className="h-full overflow-auto p-4">
            <Card className="mb-4">
              <CardHeader className="px-4 pb-0">
                <div className="flex items-end justify-between">
                  <h4 className="text-xl font-semibold">Post</h4>
                  <div className="text-xs text-muted-foreground">
                    ~{readingTime} min read
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Title
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Write a compelling title…"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Slug
                    </label>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 pb-0">
                <h5 className="text-base font-semibold">Content</h5>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {/* EditorJS area */}
                {mounted ? (
                  <BlockEditor
                    initialData={editorData}
                    onChange={setEditorData}
                    onReady={({ insertImage }) =>
                      (insertImageRef.current = insertImage)
                    }
                  />
                ) : (
                  <div className="min-h-[60vh] rounded-b-lg border-t p-3" />
                )}
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
