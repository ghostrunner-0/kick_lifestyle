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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

import { showToast } from "@/lib/ShowToast";
import {
  Plus,
  Save,
  Edit3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* utils */
const cn = (...a) => a.filter(Boolean).join(" ");
const debounce = (fn, ms = 350) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};
const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

/* ---------- Reusable ComboBox (searchable, dark-mode safe) ---------- */
function ComboBox({
  value,
  onChange,
  options,
  loading,
  onSearch,
  placeholder = "Select…",
  widthClass = "w-[420px]",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const doSearch = useMemo(
    () =>
      debounce((q) => {
        onSearch && onSearch(q);
      }, 250),
    [onSearch]
  );

  useEffect(() => {
    if (open) doSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("justify-between min-w-0 overflow-hidden", widthClass)}
        >
          <span
            className={cn(
              selectedLabel ? "" : "text-muted-foreground",
              "block truncate text-left min-w-0"
            )}
          >
            {selectedLabel || placeholder}
          </span>
          <svg
            className="ml-2 h-4 w-4 shrink-0 opacity-60"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          {onSearch ? (
            <CommandInput
              placeholder="Search…"
              value={query}
              onValueChange={setQuery}
            />
          ) : null}
          <CommandList>
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <CommandEmpty>No results</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      className="truncate"
                      onSelect={() => {
                        onChange(opt.value, opt);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* Page */
export default function ServiceIssuesPage() {
  /* =============== CREATE FORM (with real product category) =============== */
  const [catId, setCatId] = useState("");
  const [catOptions, setCatOptions] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  const [issueName, setIssueName] = useState("");
  const [active, setActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchCategories = useCallback(async (q = "") => {
    setCatLoading(true);
    try {
      const { data } = await axios.get("/api/category", {
        withCredentials: true,
        params: {
          start: 0,
          size: 20,
          filters: "[]",
          globalFilter: q || "",
          sorting: "[]",
          deleType: "SD",
        },
      });
      // Be defensive about shape
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      const opts = list.map((c) => ({
        value: String(c._id || c.id),
        label: c.name || c.categoryName || c.title || "Category",
        raw: c,
      }));
      setCatOptions(opts);
    } catch (e) {
      setCatOptions([]);
    } finally {
      setCatLoading(false);
    }
  }, []);

  // initial category load
  useEffect(() => {
    fetchCategories("");
  }, [fetchCategories]);

  /* =============== LIST / FILTERS =============== */
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const runSearch = useMemo(
    () =>
      debounce(async (query, pageNo, filt) => {
        setLoading(true);
        try {
          const params = { page: pageNo, limit, sort: "updatedAt:desc" };
          if (query && query.trim()) params.q = query.trim();
          if (filt === "active") params.active = true;
          if (filt === "inactive") params.active = false;

          const { data } = await axios.get("/api/admin/service/issues", {
            withCredentials: true,
            params,
          });

          let rows = [];
          let totalCount = 0;
          if (Array.isArray(data?.data?.items)) {
            rows = data.data.items;
            totalCount = Number(data.data.total || rows.length || 0);
          } else if (Array.isArray(data?.data)) {
            rows = data.data;
            totalCount = rows.length;
          } else if (Array.isArray(data)) {
            rows = data;
            totalCount = rows.length;
          }

          setItems(rows);
          setTotal(totalCount);
        } catch (e) {
          setItems([]);
          setTotal(0);
          showToast(
            "error",
            e?.response?.data?.message || e?.message || "Failed to load issues"
          );
        } finally {
          setLoading(false);
        }
      }, 250),
    [limit]
  );

  const refreshList = useCallback(() => {
    runSearch(q, page, statusFilter);
  }, [q, page, statusFilter, runSearch]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [q, statusFilter]);

  useEffect(() => {
    runSearch(q, 1, statusFilter);
  }, [q, statusFilter, runSearch]);

  /* =============== CREATE HANDLER =============== */
  const onCreate = async () => {
    if (!catId) return showToast("error", "Select a product category");
    if (!issueName.trim()) return showToast("error", "Issue name is required");

    const cat = catOptions.find((o) => String(o.value) === String(catId));
    const categoryName = cat?.label || "Category";

    setCreating(true);
    try {
      const { data } = await axios.post(
        "/api/admin/service/issues",
        {
          categoryId: catId,
          categoryName,
          issueName: issueName.trim(),
          active: !!active,
        },
        { withCredentials: true }
      );
      if (data?.success || data?._id || data?.data) {
        showToast("success", "Issue created");
        setCatId("");
        setIssueName("");
        setActive(true);
        refreshList();
      } else {
        showToast("error", data?.message || "Create failed");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 409
          ? "Duplicate category + issue already exists"
          : e?.message) ||
        "Create failed";
      showToast("error", msg);
    } finally {
      setCreating(false);
    }
  };

  /* =============== EDIT DIALOG =============== */
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editCatId, setEditCatId] = useState("");
  const [editCatOptions, setEditCatOptions] = useState([]);
  const [editCatLoading, setEditCatLoading] = useState(false);
  const [editIssueName, setEditIssueName] = useState("");
  const [editActive, setEditActive] = useState(true);

  const fetchCategoriesForEdit = useCallback(
    async (q = "", bootstrap = null) => {
      setEditCatLoading(true);
      try {
        const { data } = await axios.get("/api/category", {
          withCredentials: true,
          params: {
            start: 0,
            size: 20,
            filters: "[]",
            globalFilter: q || "",
            sorting: "[]",
            deleType: "SD",
          },
        });
        const list = Array.isArray(data?.data) ? data.data : [];
        let opts = list.map((c) => ({
          value: String(c._id || c.id),
          label: c.name || c.categoryName || c.title || "Category",
          raw: c,
        }));

        // Ensure current category is present in options so label renders
        if (
          bootstrap &&
          bootstrap.categoryId &&
          !opts.some((o) => String(o.value) === String(bootstrap.categoryId))
        ) {
          opts = [
            {
              value: String(bootstrap.categoryId),
              label: bootstrap.categoryName || "Category",
            },
            ...opts,
          ];
        }

        setEditCatOptions(opts);
      } catch {
        setEditCatOptions(
          bootstrap?.categoryId
            ? [
                {
                  value: String(bootstrap.categoryId),
                  label: bootstrap.categoryName || "Category",
                },
              ]
            : []
        );
      } finally {
        setEditCatLoading(false);
      }
    },
    []
  );

  const openEdit = (row) => {
    setEditRow(row);
    setEditCatId(String(row.categoryId || ""));
    setEditIssueName(row.issueName || "");
    setEditActive(!!row.active);
    setEditOpen(true);
    fetchCategoriesForEdit("", {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;
    if (!editCatId) return showToast("error", "Select a product category");
    if (!editIssueName.trim())
      return showToast("error", "Issue name is required");

    const cat = editCatOptions.find(
      (o) => String(o.value) === String(editCatId)
    );
    const categoryName = cat?.label || "Category";

    setSavingEdit(true);
    try {
      const { data } = await axios.put(
        `/api/admin/service/issues/${editRow._id}`,
        {
          categoryId: editCatId,
          categoryName,
          issueName: editIssueName.trim(),
          active: !!editActive,
        },
        { withCredentials: true }
      );
      if (data?.success || data?.data) {
        showToast("success", "Issue updated");
        setEditOpen(false);
        setEditRow(null);
        refreshList();
      } else {
        showToast("error", data?.message || "Update failed");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 409
          ? "Duplicate category + issue already exists"
          : e?.message) ||
        "Update failed";
      showToast("error", msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await axios.put(
        `/api/admin/service/issues/${row._id}`,
        { active: !row.active },
        { withCredentials: true }
      );
      refreshList();
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Failed to toggle"
      );
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Service Issues</h1>
        <Badge variant="secondary">Create & Edit</Badge>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshList}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create */}
      <Card>
        <CardHeader>
          <div className="font-semibold">Create New Issue</div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 space-y-1">
            <Label>Product Category</Label>
            <ComboBox
              value={catId}
              onChange={(val, opt) => setCatId(val)}
              options={catOptions}
              loading={catLoading}
              onSearch={(q) => fetchCategories(q)}
              placeholder="Search category…"
              widthClass="w-full sm:w-[420px]"
            />
          </div>
          <div className="sm:col-span-5 space-y-1">
            <Label>Issue</Label>
            <Input
              value={issueName}
              onChange={(e) => setIssueName(e.target.value)}
              placeholder="e.g., Left bud not charging"
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label>Status</Label>
            <Select
              value={active ? "active" : "inactive"}
              onValueChange={(v) => setActive(v === "active")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-12">
            <Button onClick={onCreate} disabled={creating}>
              <Plus className="h-4 w-4 mr-2" />
              {creating ? "Creating…" : "Create Issue"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List / Filters */}
      <Card>
        <CardHeader>
          <div className="font-semibold">All Issues</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 space-y-1">
              <Label>Search</Label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by category or issue…"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setStatusFilter("all");
                  }}
                >
                  Clear
                </Button>
                <Button variant="outline" onClick={refreshList}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <UiTable className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Product Category</TableHead>
                  <TableHead className="min-w-[280px]">Issue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[180px]">Updated</TableHead>
                  <TableHead className="text-right min-w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No issues found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell className="font-medium">
                        {row.categoryName || "—"}
                      </TableCell>
                      <TableCell>{row.issueName}</TableCell>
                      <TableCell>
                        {row.active ? (
                          <Badge className="bg-green-600/90 hover:bg-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground"
                          >
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{fmtDT(row.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(row)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(row)}
                            title={row.active ? "Deactivate" : "Activate"}
                          >
                            {row.active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UiTable>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm mt-2">
            <div className="text-muted-foreground">
              Page {page} of {Math.max(1, Math.ceil(total / limit))} • {total}{" "}
              item{total === 1 ? "" : "s"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  setPage(p);
                  runSearch(q, p, statusFilter);
                }}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const totalPages = Math.max(1, Math.ceil(total / limit));
                  const p = Math.min(totalPages, page + 1);
                  setPage(p);
                  runSearch(q, p, statusFilter);
                }}
                disabled={page >= Math.max(1, Math.ceil(total / limit))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Issue</DialogTitle>
          </DialogHeader>

          {editRow ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Product Category</Label>
                <ComboBox
                  value={editCatId}
                  onChange={(val) => setEditCatId(val)}
                  options={editCatOptions}
                  loading={editCatLoading}
                  onSearch={(q) => fetchCategoriesForEdit(q, editRow)}
                  placeholder="Search category…"
                  widthClass="w-full"
                />
              </div>
              <div className="space-y-1">
                <Label>Issue</Label>
                <Input
                  value={editIssueName}
                  onChange={(e) => setEditIssueName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={editActive ? "active" : "inactive"}
                  onValueChange={(v) => setEditActive(v === "active")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-4">
            <Button
              onClick={saveEdit}
              disabled={!editRow || !editCatId || !editIssueName.trim() || savingEdit}
            >
              <Save className="h-4 w-4 mr-2" />
              {savingEdit ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
