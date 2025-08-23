"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table as UiTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader as DHeader,
  DialogTitle as DTitle,
  DialogFooter as DFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { showToast } from "@/lib/ShowToast";
import { Plus, RefreshCw, PenLine, Trash2 } from "lucide-react";

/* ------------- helpers ------------- */
const formatNpr = (v) => {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rs. ${n.toLocaleString("en-IN")}`;
  }
};

const fmtDT = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
};

const toLocalDateTimeInput = (d) => {
  try {
    const dt = typeof d === "string" ? new Date(d) : d || new Date();
    const pad = (x) => String(x).padStart(2, "0");
    const yyyy = dt.getFullYear();
    const mm = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const mi = pad(dt.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
};

/* maps/shapes */
const DOC_MODELS = [
  { value: "ServiceRequestOnline", label: "Online Request" },
  { value: "ServiceRequestOffline", label: "Offline Request" },
];

const KINDS = [
  { value: "expense", label: "Expense" },
  { value: "settlement", label: "Settlement" },
];

const EXPENSE_TYPES = [
  { value: "shipping", label: "Shipping" },
  { value: "repair", label: "Repair" },
];

/* ------------- page ------------- */
export default function HisabPage() {
  /* filters */
  const [docModel, setDocModel] = useState("ServiceRequestOnline");
  const [docId, setDocId] = useState("");
  /* data */
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);

  /* dialogs */
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  /* working forms */
  const [form, setForm] = useState({
    kind: "expense",
    expenseType: "shipping",
    amount: "",
    when: toLocalDateTimeInput(new Date()),
    note: "",
  });

  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [saving, setSaving] = useState(false);

  const canLoad = useMemo(
    () => !!docModel && docId && docId.trim().length >= 8,
    [docModel, docId]
  );

  const fetchRows = useCallback(async () => {
    if (!canLoad) {
      setRows([]);
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/service/hisab", {
        withCredentials: true,
        params: {
          docModel,
          doc: docId.trim(),
          page: 1,
          limit: 200,
        },
      });
      if (data?.success) {
        setRows(Array.isArray(data.data?.items) ? data.data.items : []);
      } else {
        showToast("error", data?.message || "Failed to load entries");
        setRows([]);
      }
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Failed to load entries"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canLoad, docModel, docId]);

  const fetchSummary = useCallback(async () => {
    if (!canLoad) {
      setSummary(null);
      return;
    }
    try {
      const { data } = await axios.get("/api/admin/service/hisab/summary", {
        withCredentials: true,
        params: {
          docModel,
          doc: docId.trim(),
        },
      });
      if (data?.success) {
        setSummary(data.data);
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    }
  }, [canLoad, docModel, docId]);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchRows(), fetchSummary()]);
  }, [fetchRows, fetchSummary]);

  useEffect(() => {
    setRows([]);
    setSummary(null);
  }, [docModel]);

  /* add form handlers */
  const resetAddForm = () =>
    setForm({
      kind: "expense",
      expenseType: "shipping",
      amount: "",
      when: toLocalDateTimeInput(new Date()),
      note: "",
    });

  const openAdd = () => {
    resetAddForm();
    setAddOpen(true);
  };

  const saveAdd = async () => {
    if (!canLoad) return showToast("error", "Pick request type & ID first");
    if (!form.kind) return showToast("error", "Select kind");
    const amt = Number(form.amount);
    if (!(amt > 0)) return showToast("error", "Amount must be > 0");
    if (form.kind === "expense" && !form.expenseType) {
      return showToast("error", "Pick expense type");
    }

    setSaving(true);
    try {
      const payload = {
        docModel,
        doc: docId.trim(),
        kind: form.kind,
        amount: amt,
        when: form.when ? new Date(form.when).toISOString() : undefined,
        note: form.note || "",
      };
      if (form.kind === "expense") payload.expenseType = form.expenseType;

      const { data } = await axios.post("/api/admin/service/hisab", payload, {
        withCredentials: true,
      });

      if (data?.success) {
        showToast("success", "Entry added");
        setAddOpen(false);
        await loadAll();
      } else {
        showToast("error", data?.message || "Failed to add");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  /* edit */
  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      kind: row.kind,
      expenseType: row.expenseType || "shipping",
      amount: String(row.amount || ""),
      when: toLocalDateTimeInput(row.when || row.createdAt),
      note: row.note || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRow?._id) return;
    const amt = Number(form.amount);
    if (!(amt > 0)) return showToast("error", "Amount must be > 0");
    if (form.kind === "expense" && !form.expenseType) {
      return showToast("error", "Pick expense type");
    }

    setSaving(true);
    try {
      const payload = {
        amount: amt,
        when: form.when ? new Date(form.when).toISOString() : undefined,
        note: form.note || "",
        kind: form.kind,
      };
      if (form.kind === "expense") payload.expenseType = form.expenseType;
      if (form.kind === "settlement") payload.expenseType = null;

      const { data } = await axios.patch(
        `/api/admin/service/hisab/${editRow._id}`,
        payload,
        { withCredentials: true }
      );

      if (data?.success) {
        showToast("success", "Entry updated");
        setEditOpen(false);
        setEditRow(null);
        await loadAll();
      } else {
        showToast("error", data?.message || "Failed to update");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  /* delete */
  const openDelete = (row) => {
    setDeleteRow(row);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleteRow?._id) return;
    try {
      const { data } = await axios.delete(
        `/api/admin/service/hisab/${deleteRow._id}`,
        { withCredentials: true }
      );
      if (data?.success) {
        showToast("success", "Entry deleted");
        setDeleteOpen(false);
        setDeleteRow(null);
        await loadAll();
      } else {
        showToast("error", data?.message || "Delete failed");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Delete failed");
    }
  };

  const expenseTotals = useMemo(() => {
    const ship = summary?.expense?.shipping || 0;
    const rep = summary?.expense?.repair || 0;
    const total = summary?.expense?.total || ship + rep;
    const settle = summary?.settlement?.total || 0;
    const balance = summary?.balance ?? total - settle;
    return { ship, rep, total, settle, balance };
  }, [summary]);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Service Hisab</h1>
        <Badge variant="secondary">expense vs settlement</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadAll}
            disabled={!canLoad || loading}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openAdd} disabled={!canLoad}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4 space-y-1">
              <Label>Request Type</Label>
              <Select value={docModel} onValueChange={setDocModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick request type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-6 space-y-1">
              <Label>Service Request ID</Label>
              <Input
                placeholder="Enter service request _id"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <Button className="w-full" onClick={loadAll} disabled={!canLoad || loading}>
                {loading ? "Loading…" : "Load"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Summary</div>
            {summary ? (
              <Badge variant={expenseTotals.balance > 0 ? "destructive" : "secondary"}>
                Balance: {formatNpr(expenseTotals.balance)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="text-sm">
          {summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Shipping</div>
                <div className="font-medium">{formatNpr(expenseTotals.ship)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Repair</div>
                <div className="font-medium">{formatNpr(expenseTotals.rep)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Expense Total</div>
                <div className="font-medium">{formatNpr(expenseTotals.total)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Settlement</div>
                <div className="font-medium">{formatNpr(expenseTotals.settle)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Entries</div>
                <div className="font-medium">{summary?.count || 0}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Load a request to see summary.</div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Entries</div>
            <div className="text-sm text-muted-foreground">
              Showing {rows.length}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <UiTable className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No entries.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>{fmtDT(r.when || r.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          className="capitalize"
                          variant={r.kind === "settlement" ? "secondary" : "outline"}
                        >
                          {r.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{r.expenseType || "—"}</TableCell>
                      <TableCell className="text-right">{formatNpr(r.amount)}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{r.note || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                          <PenLine className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDelete(r)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UiTable>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DHeader>
            <DTitle>Add Entry</DTitle>
          </DHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    kind: v,
                    expenseType: v === "expense" ? (f.expenseType || "shipping") : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select kind" />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.kind === "expense" && (
              <div className="space-y-1">
                <Label>Expense Type</Label>
                <Select
                  value={form.expenseType}
                  onValueChange={(v) => setForm((f) => ({ ...f, expenseType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="e.g., 350"
              />
            </div>

            <div className="space-y-1">
              <Label>When</Label>
              <Input
                type="datetime-local"
                value={form.when}
                onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional note"
              />
            </div>
          </div>
          <DFooter className="mt-3">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAdd} disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </DFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DHeader>
            <DTitle>Edit Entry</DTitle>
          </DHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    kind: v,
                    expenseType: v === "expense" ? (f.expenseType || "shipping") : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select kind" />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.kind === "expense" && (
              <div className="space-y-1">
                <Label>Expense Type</Label>
                <Select
                  value={form.expenseType}
                  onValueChange={(v) => setForm((f) => ({ ...f, expenseType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>When</Label>
              <Input
                type="datetime-local"
                value={form.when}
                onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional note"
              />
            </div>
          </div>
          <DFooter className="mt-3">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground">
            This action cannot be undone.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
