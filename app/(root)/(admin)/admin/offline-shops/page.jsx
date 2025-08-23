"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { showToast } from "@/lib/ShowToast";

/* shadcn ui */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table as UiTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

/* icons */
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Save,
  Phone,
  MapPin,
  User2,
  X,
} from "lucide-react";

/* utils */
const cn = (...a) => a.filter(Boolean).join(" ");
const digits = (s) => (String(s || "").match(/\d+/g) || []).join("");

// ---------- Add / Edit Dialog ----------
function ShopFormDialog({ trigger, initial, onSaved }) {
  const isEdit = !!initial?._id;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson || "");

  // keep fields in sync when switching from add -> edit
  useEffect(() => {
    if (!open) return;
    setName(initial?.name || "");
    setPhone(initial?.phone || "");
    setLocation(initial?.location || "");
    setContactPerson(initial?.contactPerson || "");
  }, [initial, open]);

  const save = async () => {
    if (!name.trim()) {
      showToast("error", "Shop name is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await axios.patch(
          `/api/admin/offline-shops/${initial._id}`,
          { name: name.trim(), phone: phone.trim(), location: location.trim(), contactPerson: contactPerson.trim() },
          { withCredentials: true }
        );
        if (data?.success) {
          showToast("success", "Shop updated");
          onSaved?.(data.data);
          setOpen(false);
        } else {
          showToast("error", data?.message || "Update failed");
        }
      } else {
        const { data } = await axios.post(
          "/api/admin/offline-shops",
          { name: name.trim(), phone: phone.trim(), location: location.trim(), contactPerson: contactPerson.trim() },
          { withCredentials: true }
        );
        if (data?.success) {
          showToast("success", "Shop created");
          onSaved?.(data.data);
          setOpen(false);
        } else {
          showToast("error", data?.message || "Create failed");
        }
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button><Plus className="h-4 w-4 mr-2" />Add shop</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit shop" : "Add shop"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <Label htmlFor="shop-name">Name *</Label>
            <Input id="shop-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop name" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="shop-phone">Phone</Label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 opacity-60" />
              <Input
                id="shop-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01-5551234 / 98XXXXXXXX"
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="shop-location">Location</Label>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 opacity-60" />
              <Input
                id="shop-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Address / City"
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="shop-contact">Contact person</Label>
            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 opacity-60" />
              <Input
                id="shop-contact"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Person at shop"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Delete Confirm ----------
function DeleteConfirm({ id, name, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const doDelete = async () => {
    setBusy(true);
    try {
      const { data } = await axios.delete(`/api/admin/offline-shops/${id}`, { withCredentials: true });
      if (data?.success) {
        showToast("success", "Shop deleted");
        onDeleted?.(id);
        setOpen(false);
      } else {
        showToast("error", data?.message || "Delete failed");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this shop?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <span className="font-medium">{name}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={doDelete} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------- Page ----------
export default function OfflineShopsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // paging + search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/offline-shops", {
        withCredentials: true,
        params: { page, limit, q, sort: "createdAt:desc" },
      });
      if (data?.success) {
        setRows(data.data.items || []);
        setTotal(data.data.total || 0);
      } else {
        showToast("error", data?.message || "Failed to load");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, limit, q]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQ(qInput.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const onSaved = () => fetchList();
  const onDeleted = () => fetchList();

  return (
    <div className="p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Offline Shops</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-[260px]"
              placeholder="Search name, phone, location…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={fetchList}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <ShopFormDialog
            onSaved={onSaved}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add shop
              </Button>
            }
          />
        </div>
      </div>

      {/* Table */}
      <Card className="rounded shadow-sm">
        <CardHeader className="py-3 px-3 border-b">
          <div className="text-sm text-muted-foreground">
            Showing {(rows || []).length} / {total}
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="rounded-md border overflow-x-auto">
            <UiTable className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No shops found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.phone || "—"}</TableCell>
                      <TableCell className="max-w-[380px] truncate">{r.location || "—"}</TableCell>
                      <TableCell>{r.contactPerson || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ShopFormDialog
                            initial={r}
                            onSaved={onSaved}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DeleteConfirm id={r._id} name={r.name} onDeleted={onDeleted} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UiTable>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Page <span className="font-medium">{page}</span> of{" "}
              <span className="font-medium">{pages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                disabled={page >= pages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
