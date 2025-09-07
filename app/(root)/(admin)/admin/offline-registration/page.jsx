"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { showToast } from "@/lib/ShowToast";
import {
  Loader2,
  Eye,
  Pencil,
  Save,
  XCircle,
  CheckCircle2,
} from "lucide-react";

const api = axios.create({ baseURL: "/", withCredentials: true });

function fmt(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}
function statusBadge(s) {
  const v = (s || "pending").toLowerCase();
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

const PRIMARY = "#fcba17";

export default function OfflineRegistrationAdminPage() {
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState("all"); // all|pending|approved|rejected

  // Image preview
  const [preview, setPreview] = useState({ open: false, url: "", alt: "" });

  // Edit dialog state
  const [edit, setEdit] = useState({
    open: false,
    id: null,
    values: null,
  });
  const [saving, setSaving] = useState(false);

  // Confirm quick decision
  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
    action: null,
  });
  const [actingId, setActingId] = useState(null);

  // ---- Fetch
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
        if (!cancelled)
          showToast(
            "error",
            e?.response?.data?.message ||
              e?.message ||
              "Failed to load registrations"
          );
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const filtered = useMemo(() => {
    // server already filtered by status; keep for safety
    return (items || []).filter((r) =>
      status === "all" ? true : (r.status || "pending") === status
    );
  }, [items, status]);

  // ---- Preview
  const openPreview = (row) => {
    const raw = String(row?.purchaseProof?.path || "");
    if (!raw) return showToast("warning", "No image available.");
    const normalized = raw.replace(/\\/g, "/"); // windows → posix
    const fname = normalized.split("/").pop(); // abc.jpg
    if (!fname) return showToast("warning", "No image available.");
    setPreview({
      open: true,
      url: `/api/admin/offline-registration/image/file/${encodeURIComponent(
        fname
      )}`,
      alt: row?.name ? `Warranty card • ${row.name}` : "Warranty card",
    });
  };

  // ---- Edit
  const onEdit = (row) => {
    setEdit({
      open: true,
      id: row._id,
      values: {
        name: row.name || "",
        email: row.email || "",
        phone: row.phone || "",
        productName: row.productName || "",
        serial: row.serial || "",
        purchaseDate: row.purchaseDate
          ? new Date(row.purchaseDate).toISOString().slice(0, 10)
          : "",
        purchasedFrom: row.purchasedFrom || "kick", // kick|daraz|offline
        shopName: row.shopName || "",
        status: row.status || "pending",
      },
    });
  };

  const setVal = (k, v) =>
    setEdit((e) => ({ ...e, values: { ...e.values, [k]: v } }));

  const saveEdit = async () => {
    if (!edit.id) return;
    setSaving(true);
    try {
      const payload = { ...edit.values };
      // ensure strings
      payload.name = String(payload.name || "").trim();
      payload.email = String(payload.email || "")
        .trim()
        .toLowerCase();
      payload.phone = String(payload.phone || "").trim();
      payload.productName = String(payload.productName || "").trim();
      payload.serial = String(payload.serial || "")
        .trim()
        .toUpperCase();
      payload.purchasedFrom = String(payload.purchasedFrom || "").toLowerCase();
      payload.shopName =
        payload.purchasedFrom === "offline"
          ? String(payload.shopName || "").trim()
          : "";

      const { data } = await api.patch(
        `/api/admin/offline-registration/${edit.id}`,
        payload
      );

      if (!data?.success) throw new Error(data?.message || "Save failed");

      // merge in local
      setItems((prev) =>
        prev.map((r) =>
          r._id === edit.id
            ? {
                ...r,
                ...data.data, // server returns updated document (without big fields)
              }
            : r
        )
      );
      setEdit({ open: false, id: null, values: null });

      const msg =
        payload.status && payload.status !== "pending"
          ? "Saved. Decision made & image removed."
          : "Saved.";
      showToast("success", msg);
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  // ---- Quick approve/reject
  const confirmAction = (id, action) => setConfirm({ open: true, id, action });

  const performAction = async () => {
    const { id, action } = confirm;
    if (!id || !action) return;
    setActingId(id);
    try {
      // Simply use PATCH with status change; API will delete the image
      const { data } = await api.patch(
        `/api/admin/offline-registration/${id}`,
        { status: action === "approve" ? "approved" : "rejected" }
      );
      if (!data?.success) throw new Error(data?.message || "Action failed");

      setItems((prev) =>
        prev.map((r) =>
          r._id === id
            ? {
                ...r,
                ...data.data, // includes status + purchaseProof removed
              }
            : r
        )
      );
      showToast(
        "success",
        action === "approve"
          ? "Approved & cleaned up!"
          : "Rejected & cleaned up!"
      );
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Failed to update"
      );
    } finally {
      setActingId(null);
      setConfirm({ open: false, id: null, action: null });
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 space-y-6">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            Offline Warranty Registrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit registrations, change status, and preview/delete warranty card
            images on decision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
              className={status === s ? "" : "bg-white"}
              style={
                status === s ? { backgroundColor: PRIMARY, color: "#111" } : {}
              }
            >
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">Registrations</CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Customer</TableHead>
                  <TableHead className="min-w-[140px]">Phone</TableHead>
                  <TableHead className="min-w-[220px]">
                    Product / Serial
                  </TableHead>
                  <TableHead className="min-w-[140px]">Purchased</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[260px] text-right">
                    Actions
                  </TableHead>
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
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-muted-foreground"
                    >
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
                      <TableRow key={r._id}>
                        <TableCell>
                          <div className="font-medium">{r.name || "-"}</div>
                          <div className="text-xs text-muted-foreground break-all">
                            {r.email || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.phone || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium truncate max-w-[320px]">
                            {r.productName || "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.serial || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{fmt(r.purchaseDate)}</div>
                          <div className="text-xs text-muted-foreground">
                            {channel}
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPreview(r)}
                              disabled={!hasImage}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(r)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
                              onClick={() => confirmAction(r._id, "approve")}
                              disabled={
                                disabled ||
                                (r.status || "pending") !== "pending"
                              }
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => confirmAction(r._id, "reject")}
                              disabled={
                                disabled ||
                                (r.status || "pending") !== "pending"
                              }
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

      {/* Image Preview */}
      <Dialog
        open={preview.open}
        onOpenChange={(o) => setPreview((p) => ({ ...p, open: o }))}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Warranty Card</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            {preview.url ? (
              <img
                src={preview.url}
                alt={preview.alt || "Warranty card"}
                className="block w-full h-auto object-contain rounded-lg"
                draggable={false}
              />
            ) : (
              <div className="text-sm text-muted-foreground">No image.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={edit.open}
        onOpenChange={(o) => setEdit((e) => ({ ...e, open: o }))}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Registration</DialogTitle>
          </DialogHeader>
          {edit.values ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={edit.values.name}
                    onChange={(e) => setVal("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={edit.values.email}
                    onChange={(e) => setVal("email", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={edit.values.phone}
                    onChange={(e) => setVal("phone", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Product (label)</label>
                  <Input
                    value={edit.values.productName}
                    onChange={(e) => setVal("productName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Serial</label>
                  <Input
                    value={edit.values.serial}
                    onChange={(e) =>
                      setVal("serial", e.target.value.toUpperCase())
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Purchase date</label>
                  <Input
                    type="date"
                    value={edit.values.purchaseDate}
                    onChange={(e) => setVal("purchaseDate", e.target.value)}
                  />
                </div>
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
                    <Input
                      value={edit.values.shopName}
                      onChange={(e) => setVal("shopName", e.target.value)}
                    />
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
                    <option value="approved">
                      Approved (image will be deleted)
                    </option>
                    <option value="rejected">
                      Rejected (image will be deleted)
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setEdit({ open: false, id: null, values: null })
                  }
                >
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={saving}>
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
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirm decision */}
      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm((s) => ({ ...s, open: o }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "approve"
                ? "Approve registration?"
                : "Reject registration?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will update the status and permanently remove the uploaded
              warranty card image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actingId != null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performAction}
              disabled={actingId != null}
              className={
                confirm.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : ""
              }
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
