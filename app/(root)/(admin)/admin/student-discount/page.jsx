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
import { Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";

const api = axios.create({ baseURL: "/", withCredentials: true });

function fmt(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function StatusBadge({ value }) {
  const status = (value || "pending").toLowerCase();
  if (status === "approved")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
        Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
        Rejected
      </Badge>
    );
  return <Badge variant="secondary">Pending</Badge>;
}

export default function StudentDiscountAdminPage() {
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); // all | pending | approved | rejected

  const [preview, setPreview] = useState({ open: false, url: "", alt: "" });

  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
    action: null,
  });
  const [actingId, setActingId] = useState(null);

  // ---- Fetch list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const { data } = await api.get("/api/admin/student-discount", {
          params: { status: status === "all" ? undefined : status },
        });

        // tolerate both shapes: {data: {items}} or {data: [...]}
        const arr = Array.isArray(data?.data?.items)
          ? data.data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

        if (!cancelled) setItems(arr);
      } catch (e) {
        if (!cancelled) {
          showToast(
            "error",
            e?.response?.data?.message ||
              e?.message ||
              "Failed to load requests"
          );
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // ---- Derived client-side search filter
  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return (items || []).filter((r) => {
      if (status !== "all" && (r.status || "pending").toLowerCase() !== status)
        return false;
      if (!q) return true;
      return [r.name, r.email, r.phoneNumber, r.collegeName].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [items, status, search]);

  // ---- Actions
  const openPreview = (row) => {
    const raw = String(row?.idCardPhoto?.path || "");
    if (!raw) {
      showToast("warning", "No image available.");
      return;
    }
    // normalize and extract the final segment (filename with extension)
    const normalized = raw.replace(/\\/g, "/"); // win -> posix
    const fname = normalized.split("/").pop(); // just "abc.png"
    if (!fname) {
      showToast("warning", "No image available.");
      return;
    }
    setPreview({
      open: true,
      url: `/api/admin/student-discount/image/file/${encodeURIComponent(
        fname
      )}`,
      alt: row?.name ? `Student ID • ${row.name}` : "Student ID",
    });
  };

  const confirmAction = (id, action) => setConfirm({ open: true, id, action });

  const performAction = async () => {
    const { id, action } = confirm;
    if (!id || !action) return;
    setActingId(id);
    try {
      const { data } = await api.post(`/api/admin/student-discount/desicion/${id}`, {
        action,
      });
      if (!data?.success) throw new Error(data?.message || "Action failed");

      // optimistic local update (also drop image reference after cleanup)
      setItems((prev) =>
        prev.map((it) =>
          it._id === id
            ? {
                ...it,
                status: action === "approve" ? "approved" : "rejected",
                decidedAt: new Date().toISOString(),
                idCardPhoto: null,
              }
            : it
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            Student Discount Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Approve or reject applications. Image will be removed once a
            decision is made.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search name, email, phone, college…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">Requests</CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Applicant</TableHead>
                  <TableHead className="min-w-[150px]">Phone</TableHead>
                  <TableHead className="min-w-[220px]">College</TableHead>
                  <TableHead className="min-w-[160px]">Submitted</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[220px] text-right">
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
                      No requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const hasImage = !!r?.idCardPhoto?.path;
                    const disabled = actingId === r._id;
                    return (
                      <TableRow key={r._id}>
                        <TableCell>
                          <div className="font-medium">{r.name || "-"}</div>
                          <div className="text-xs text-muted-foreground break-all">
                            {r.email || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.phoneNumber || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium truncate max-w-[320px]">
                            {r.collegeName || "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.collegePhoneNumber || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {fmt(r.createdAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={r.status} />
                        </TableCell>
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
                              onClick={() => confirmAction(r._id, "approve")}
                              disabled={
                                disabled ||
                                (r.status || "pending") !== "pending"
                              }
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
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
            <DialogTitle>Student ID</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            {preview.url ? (
              <img
                src={preview.url}
                alt={preview.alt || "Student ID"}
                className="block w-full h-auto object-contain rounded-lg"
                draggable={false}
              />
            ) : (
              <div className="text-sm text-muted-foreground">No image.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm */}
      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm((s) => ({ ...s, open: o }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "approve"
                ? "Approve request?"
                : "Reject request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will update the application status and remove the uploaded ID
              image from storage.
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Working…
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
