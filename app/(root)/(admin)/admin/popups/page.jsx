"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const TYPE_FIELDS_HELP = {
  discount: "Needs: imageUrl, couponCode (optional), ctaText, ctaHref.",
  "image-link": "Needs: imageUrl, linkHref. Set noBackdrop=true for no bg.",
  launch:
    "Needs: imageUrl, launchTitle, launchSubtitle, launchAt, launchCtaText, launchCtaHref.",
};

function Row({ item, onEdit, onDelete }) {
  return (
    <div className="rounded border p-3 flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold truncate">
            {item.title || item.launchTitle || "(untitled)"}
          </div>
          <Badge variant="secondary" className="capitalize">
            {item.type}
          </Badge>
          {item.isActive ? (
            <Badge className="bg-green-500">Active</Badge>
          ) : (
            <Badge>Inactive</Badge>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground truncate">
          Pages: {(item.pages || []).length ? item.pages.join(", ") : "Global"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(item)}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </div>
    </div>
  );
}

function Editor({ open, onOpenChange, initial, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(
    initial || {
      type: "discount",
      isActive: true,
      pages: [],
      frequency: { scope: "session", maxShows: 1 },
    }
  );

  useEffect(() => {
    setForm(
      initial || {
        type: "discount",
        isActive: true,
        pages: [],
        frequency: { scope: "session", maxShows: 1 },
      }
    );
  }, [initial]);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async () => {
    setSaving(true);
    try {
      if (form._id) {
        await axios.put(`/api/admin/popups/${form._id}`, form);
      } else {
        await axios.post(`/api/admin/popups`, form);
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e?.response?.data || e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form._id ? "Edit Popup" : "New Popup"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">discount</SelectItem>
                <SelectItem value="image-link">image-link</SelectItem>
                <SelectItem value="launch">launch</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mt-1">
              {TYPE_FIELDS_HELP[form.type]}
            </div>
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={form.title || ""}
              onChange={(e) => set("title", e.target.value)}
              placeholder="(optional)"
            />
          </div>

          <div>
            <Label>Image URL</Label>
            <Input
              value={form.imageUrl || ""}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="/media/..."
            />
          </div>

          <div>
            <Label>Pages (comma separated)</Label>
            <Input
              value={(form.pages || []).join(", ")}
              onChange={(e) =>
                set(
                  "pages",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder='e.g., "/", "/product/*"'
            />
          </div>

          <div>
            <Label>Priority</Label>
            <Input
              type="number"
              value={form.priority ?? 10}
              onChange={(e) => set("priority", Number(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={!!form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
            />
            <Label htmlFor="active">Active</Label>
          </div>

          <div className="sm:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <Label>Start At</Label>
              <Input
                type="datetime-local"
                value={
                  form.startAt
                    ? new Date(form.startAt).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  set(
                    "startAt",
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null
                  )
                }
              />
            </div>
            <div>
              <Label>End At</Label>
              <Input
                type="datetime-local"
                value={
                  form.endAt
                    ? new Date(form.endAt).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  set(
                    "endAt",
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null
                  )
                }
              />
            </div>
          </div>

          <Separator className="sm:col-span-2" />

          {/* Type-specific */}
          {form.type === "discount" && (
            <>
              <div>
                <Label>Coupon Code</Label>
                <Input
                  value={form.couponCode || ""}
                  onChange={(e) => set("couponCode", e.target.value)}
                />
              </div>
              <div>
                <Label>CTA Text</Label>
                <Input
                  value={form.ctaText || ""}
                  onChange={(e) => set("ctaText", e.target.value)}
                  placeholder="Shop Now"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>CTA Link</Label>
                <Input
                  value={form.ctaHref || ""}
                  onChange={(e) => set("ctaHref", e.target.value)}
                  placeholder="/, /deals"
                />
              </div>
            </>
          )}

          {form.type === "image-link" && (
            <>
              <div>
                <Label>Link Href</Label>
                <Input
                  value={form.linkHref || ""}
                  onChange={(e) => set("linkHref", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="nobg"
                  type="checkbox"
                  checked={!!form.noBackdrop}
                  onChange={(e) => set("noBackdrop", e.target.checked)}
                />
                <Label htmlFor="nobg">No Backdrop (transparent)</Label>
              </div>
            </>
          )}

          {form.type === "launch" && (
            <>
              <div>
                <Label>Launch Title</Label>
                <Input
                  value={form.launchTitle || ""}
                  onChange={(e) => set("launchTitle", e.target.value)}
                />
              </div>
              <div>
                <Label>Launch Subtitle</Label>
                <Input
                  value={form.launchSubtitle || ""}
                  onChange={(e) => set("launchSubtitle", e.target.value)}
                />
              </div>
              <div>
                <Label>Launch At</Label>
                <Input
                  type="datetime-local"
                  value={
                    form.launchAt
                      ? new Date(form.launchAt).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    set(
                      "launchAt",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null
                    )
                  }
                />
              </div>
              <div>
                <Label>CTA Text</Label>
                <Input
                  value={form.launchCtaText || ""}
                  onChange={(e) => set("launchCtaText", e.target.value)}
                  placeholder="Notify Me"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>CTA Link</Label>
                <Input
                  value={form.launchCtaHref || ""}
                  onChange={(e) => set("launchCtaHref", e.target.value)}
                  placeholder="/notify"
                />
              </div>
            </>
          )}

          <Separator className="sm:col-span-2" />

          <div>
            <Label>Frequency Scope</Label>
            <Select
              value={form.frequency?.scope || "session"}
              onValueChange={(v) =>
                set("frequency", { ...(form.frequency || {}), scope: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session">session</SelectItem>
                <SelectItem value="daily">daily</SelectItem>
                <SelectItem value="once">once</SelectItem>
                <SelectItem value="always">always</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max Shows</Label>
            <Input
              type="number"
              value={form.frequency?.maxShows ?? 1}
              onChange={(e) =>
                set("frequency", {
                  ...(form.frequency || {}),
                  maxShows: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPopupsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/popups", { params: { q } });
      setItems(Array.isArray(data?.data?.items) ? data.data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // initial

  const onEdit = (it) => {
    setCurrent(it);
    setOpen(true);
  };
  const onDelete = async (it) => {
    if (!confirm("Delete popup?")) return;
    await axios.delete(`/api/admin/popups/${it._id}`);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xl font-semibold">Website Popups</div>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
          />
          <Button onClick={load}>Search</Button>
          <Button
            onClick={() => {
              setCurrent(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">Manage popups</CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No popups found.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <Row
                  key={it._id}
                  item={it}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Editor
        open={open}
        onOpenChange={setOpen}
        initial={current}
        onSaved={load}
      />
    </div>
  );
}
