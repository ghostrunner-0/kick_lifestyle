"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import * as RD from "@radix-ui/react-dialog";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Loader2,
  Eye,
  Pencil,
  Save,
  XCircle,
  CheckCircle2,
  Calendar as CalendarIcon,
  X as XIcon,
  ExternalLink,
} from "lucide-react";
import { showToast } from "@/lib/ShowToast";

const api = axios.create({ baseURL: "/", withCredentials: true });
const PRIMARY = "#fcba17";

/* helpers */
function fmt(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}
function StatusBadge({ value }) {
  const v = (value || "pending").toLowerCase();
  if (v === "approved")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
        Approved
      </Badge>
    );
  if (v === "rejected")
    return (
      <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
        Rejected
      </Badge>
    );
  return <Badge variant="secondary">Pending</Badge>;
}
const buildSecureImgUrl = (storedPath) => {
  const raw = String(storedPath || "");
  if (!raw) return "";
  const normalized = raw.replace(/\\/g, "/");
  const fname = normalized.split("/").pop();
  return fname
    ? `/api/admin/offline-registration/image/file/${encodeURIComponent(fname)}`
    : "";
};

/* controlled date field (fix for dialog) */
function DateField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1">Purchase date</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`w-full justify-start text-left font-normal h-10 ${!value ? "text-muted-foreground" : ""}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value instanceof Date ? format(value, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="z-[999999] w-auto p-0">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
            disabled={(date) => date > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function OfflineRegistrationAdminPage() {
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState("all");

  const [preview, setPreview] = useState({ open: false, url: "", alt: "" });

  const [edit, setEdit] = useState({
    open: false,
    id: null,
    values: null,
    imgUrl: "",
    imgAlt: "",
  });
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState({ open: false, id: null, action: null });
  const [actingId, setActingId] = useState(null);

  /* fetch */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const { data } = await api.get("/api/admin/offline-registration", {
          params: { status: status === "all" ? undefined : status },
        });
        const arr = Array.isArray(data?.data?.items)
          ? data.data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        if (!cancelled) setItems(arr);
      } catch (e) {
        if (!cancelled) showToast("error", e?.response?.data?.message || e?.message || "Failed to load registrations");
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const filtered = useMemo(
    () => (items || []).filter((r) => (status === "all" ? true : (r.status || "pending") === status)),
    [items, status]
  );

  /* actions */
  const openPreview = (row) => {
    const url = buildSecureImgUrl(row?.purchaseProof?.path);
    if (!url) return showToast("warning", "No image available.");
    setPreview({
      open: true,
      url,
      alt: row?.name ? `Warranty card • ${row.name}` : "Warranty card",
    });
  };

  const onEdit = (row) => {
    const purchaseDate = row.purchaseDate ? new Date(row.purchaseDate) : null;
    const imgUrl = buildSecureImgUrl(row?.purchaseProof?.path);
    const imgAlt = row?.name ? `Warranty card • ${row.name}` : "Warranty card";
    setEdit({
      open: true,
      id: row._id,
      values: {
        name: row.name || "",
        email: row.email || "",
        phone: row.phone || "",
        productName: row.productName || "",
        serial: row.serial || "",
        purchaseDate,
        purchasedFrom: row.purchasedFrom || "kick",
        shopName: row.shopName || "",
        status: row.status || "pending",
      },
      imgUrl,
      imgAlt,
    });
  };

  const setVal = (k, v) => setEdit((e) => ({ ...e, values: { ...e.values, [k]: v } }));

  const saveEdit = async () => {
    if (!edit.id) return;
    setSaving(true);
    try {
      const payload = { ...edit.values };
      payload.name = String(payload.name || "").trim();
      payload.email = String(payload.email || "").trim().toLowerCase();
      payload.phone = String(payload.phone || "").trim();
      payload.productName = String(payload.productName || "").trim();
      payload.serial = String(payload.serial || "").trim().toUpperCase();
      payload.purchasedFrom = String(payload.purchasedFrom || "").toLowerCase();
      payload.shopName = payload.purchasedFrom === "offline" ? String(payload.shopName || "").trim() : "";
      payload.purchaseDate =
        payload.purchaseDate instanceof Date && !Number.isNaN(payload.purchaseDate.valueOf())
          ? payload.purchaseDate.toISOString()
          : null;

      const { data } = await api.patch(`/api/admin/offline-registration/${edit.id}`, payload);
      if (!data?.success) throw new Error(data?.message || "Save failed");

      setItems((prev) => prev.map((r) => (r._id === edit.id ? { ...r, ...data.data } : r)));

      const decided = payload.status && payload.status !== "pending";
      setEdit({ open: false, id: null, values: null, imgUrl: decided ? "" : edit.imgUrl, imgAlt: decided ? "" : edit.imgAlt });

      showToast("success", decided ? "Saved. Decision made & image removed." : "Saved.");
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = (id, action) => setConfirm({ open: true, id, action });

  const performAction = async () => {
    const { id, action } = confirm;
    if (!id || !action) return;
    setActingId(id);
    try {
      const { data } = await api.patch(`/api/admin/offline-registration/${id}`, {
        status: action === "approve" ? "approved" : "rejected",
      });
      if (!data?.success) throw new Error(data?.message || "Action failed");

      setItems((prev) => prev.map((r) => (r._id === id ? { ...r, ...data.data } : r)));
      showToast("success", action === "approve" ? "Approved & cleaned up!" : "Rejected & cleaned up!");
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to update");
    } finally {
      setActingId(null);
      setConfirm({ open: false, id: null, action: null });
    }
  };

  /* UI */
  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Offline Warranty Registrations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Edit registrations, change status, and preview/delete warranty card images on decision.</p>
        </div>
        <div className="flex items-center gap-2">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 ${status !== s ? "bg-white" : ""}`}
              style={status === s ? { backgroundColor: PRIMARY, color: "#111" } : {}}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-0">Registrations</CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[820px] text-sm">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[200px]">Customer</TableHead>
                  <TableHead className="min-w-[130px] whitespace-nowrap">Phone</TableHead>
                  <TableHead className="min-w-[240px]">Product / Serial</TableHead>
                  <TableHead className="min-w-[160px] whitespace-nowrap">Purchased</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[260px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fetching ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No registrations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const hasImage = !!r?.purchaseProof?.path;
                    const disabled = actingId === r._id;
                    const channel =
                      r.purchasedFrom === "kick"
                        ? "KICK LIFESTYLE"
                        : r.purchasedFrom === "daraz"
                        ? "Daraz"
                        : r.purchasedFrom === "offline"
                        ? r.shopName
                          ? `Others • ${r.shopName}`
                          : "Others"
                        : "-";
                    return (
                      <TableRow key={r._id} className="hover:bg-muted/30">
                        <TableCell className="align-top">
                          <div className="font-medium leading-tight">{r.name || "-"}</div>
                          <div className="text-xs text-muted-foreground break-all">{r.email || "-"}</div>
                        </TableCell>
                        <TableCell className="tabular-nums align-top">{r.phone || "-"}</TableCell>
                        <TableCell className="align-top">
                          <div className="font-medium truncate max-w-[320px]">{r.productName || "-"}</div>
                          <div className="text-xs text-muted-foreground">{r.serial || "-"}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm">{fmt(r.purchaseDate)}</div>
                          <div className="text-xs text-muted-foreground">{channel}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <StatusBadge value={r.status} />
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openPreview(r)} disabled={!hasImage}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onEdit(r)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
                              onClick={() => confirmAction(r._id, "approve")}
                              disabled={disabled || (r.status || "pending") !== "pending"}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => confirmAction(r._id, "reject")}
                              disabled={disabled || (r.status || "pending") !== "pending"}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <RD.Root open={preview.open} onOpenChange={(o) => setPreview((p) => ({ ...p, open: o }))} modal={false}>
        <RD.Portal>
          <RD.Overlay className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm" />
          <RD.Content
            className="
              fixed left-1/2 top-1/2 z-[100001]
              -translate-x-1/2 -translate-y-1/2
              w-[96vw] max-w-3xl max-h-[92vh]
              rounded-2xl bg-background border shadow-xl
              p-0 overflow-hidden focus:outline-none
            "
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
              <div className="text-base font-semibold">Warranty Card</div>
              <RD.Close asChild>
                <button aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted">
                  <XIcon className="h-4 w-4" />
                </button>
              </RD.Close>
            </div>
            <div className="p-3 overflow-auto">
              {preview.url ? (
                <>
                  <img src={preview.url} alt={preview.alt || "Warranty card"} className="block w-full h-auto object-contain rounded-lg" draggable={false} />
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm">
                      <a href={preview.url} target="_blank" rel="noreferrer">
                        Open original <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No image.</div>
              )}
            </div>
          </RD.Content>
        </RD.Portal>
      </RD.Root>

      {/* Edit dialog — set modal={false} so popover calendar is interactive */}
      <RD.Root open={edit.open} onOpenChange={(o) => setEdit((e) => ({ ...e, open: o }))} modal={false}>
        <RD.Portal>
          <RD.Overlay className="fixed inset-0 z-[200000] bg-black/55 backdrop-blur-sm" />
          <RD.Content
            className="
              fixed left-1/2 top-1/2 z-[200001]
              -translate-x-1/2 -translate-y-1/2
              w-[96vw] max-w-[1400px] h-[92vh] max-h-[92vh]
              rounded-2xl bg-background border shadow-xl
              overflow-hidden focus:outline-none
              grid grid-rows-[auto_1fr]
              lg:grid-cols-[1fr_420px] lg:grid-rows-[auto_1fr]
            "
          >
            <div className="row-start-1 col-span-full sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-3 lg:px-6">
              <div>
                <RD.Title className="text-base sm:text-lg font-semibold">Edit Registration</RD.Title>
                <RD.Description className="text-xs text-muted-foreground">Update details or change status. Approve/Reject will also delete the image.</RD.Description>
              </div>
              <RD.Close asChild>
                <button aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted">
                  <XIcon className="h-4 w-4" />
                </button>
              </RD.Close>
            </div>

            <div className="row-start-2 lg:row-span-1 lg:col-start-1 min-w-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {!edit.values ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="h-10 bg-muted/50 rounded animate-pulse" />
                    <div className="h-10 bg-muted/50 rounded animate-pulse" />
                    <div className="h-10 bg-muted/50 rounded animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="block lg:hidden">
                    <div className="text-xs font-medium mb-2">Warranty Card (reference)</div>
                    <div className="relative overflow-hidden rounded-lg border bg-background">
                      {edit.imgUrl ? (
                        <img src={edit.imgUrl} alt={edit.imgAlt || "Warranty card"} className="block w-full max-h-[32vh] object-contain" draggable={false} />
                      ) : (
                        <div className="text-xs text-muted-foreground p-6 text-center">No image (already removed or not uploaded).</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input value={edit.values.name} onChange={(e) => setVal("name", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input type="email" value={edit.values.email} onChange={(e) => setVal("email", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input value={edit.values.phone} onChange={(e) => setVal("phone", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Product (label)</label>
                      <Input value={edit.values.productName} onChange={(e) => setVal("productName", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Serial</label>
                      <Input value={edit.values.serial} onChange={(e) => setVal("serial", e.target.value.toUpperCase())} />
                    </div>

                    {/* ✅ calendar now updates and closes */}
                    <DateField value={edit.values.purchaseDate} onChange={(d) => setVal("purchaseDate", d)} />

                    <div>
                      <label className="text-sm font-medium">Purchased from</label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={edit.values.purchasedFrom}
                        onChange={(e) => setVal("purchasedFrom", e.target.value)}
                      >
                        <option value="kick">KICK LIFESTYLE</option>
                        <option value="daraz">Daraz</option>
                        <option value="offline">Others</option>
                      </select>
                    </div>

                    {edit.values.purchasedFrom === "offline" ? (
                      <div>
                        <label className="text-sm font-medium">Shop name</label>
                        <Input value={edit.values.shopName} onChange={(e) => setVal("shopName", e.target.value)} />
                      </div>
                    ) : null}

                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={edit.values.status}
                        onChange={(e) => setVal("status", e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved (image will be deleted)</option>
                        <option value="rejected">Rejected (image will be deleted)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
                    <RD.Close asChild>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setEdit({ open: false, id: null, values: null, imgUrl: "", imgAlt: "" })}
                      >
                        Cancel
                      </Button>
                    </RD.Close>
                    <Button className="w-full sm:w-auto" onClick={saveEdit} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* right image panel */}
            <div className="hidden lg:flex lg:row-span-2 lg:col-start-2 flex-col border-l bg-muted/20 p-4">
              <div className="text-sm font-medium mb-2">Warranty Card (reference)</div>
              <div className="relative overflow-auto rounded-lg border bg-background p-2">
                {edit.imgUrl ? (
                  <img src={edit.imgUrl} alt={edit.imgAlt || "Warranty card"} className="block max-h-[74vh] w-auto object-contain rounded" draggable={false} />
                ) : (
                  <div className="text-xs text-muted-foreground p-6 text-center">No image (already removed or not uploaded).</div>
                )}
              </div>
            </div>
          </RD.Content>
        </RD.Portal>
      </RD.Root>

      {/* confirm decision */}
      <AlertDialog open={confirm.open} onOpenChange={(o) => setConfirm((s) => ({ ...s, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.action === "approve" ? "Approve registration?" : "Reject registration?"}</AlertDialogTitle>
            <AlertDialogDescription>This will update the status and permanently remove the uploaded warranty card image.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actingId != null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performAction}
              disabled={actingId != null}
              className={confirm.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {actingId ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Working…
                </span>
              ) : confirm.action === "approve" ? (
                "Approve"
              ) : (
                "Reject"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
