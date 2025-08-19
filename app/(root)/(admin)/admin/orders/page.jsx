"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  RefreshCw,
  Search,
  SlidersHorizontal,
  FileDown,
  FileSpreadsheet,
  Truck,
  Pencil,
} from "lucide-react";
import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD, ADMIN_ORDERS_EDIT } from "@/routes/AdminRoutes";
import { showToast } from "@/lib/ShowToast";

/* shadcn ui */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table as UiTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* tanstack table */
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

/* ---------- constants ---------- */
const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "#", label: "Orders" },
];

const ORDER_STATUSES = [
  "processing",
  "pending payment",
  "payment Not Verified",
  "Invalid Payment",
  "cancelled",
  "completed",
  "ready to pack",
  "ready to ship",
];

const PAYMENT_METHODS = [
  { value: "__ALL__", label: "All payments" },
  { value: "cod", label: "Cash on Delivery" },
  { value: "khalti", label: "Khalti" },
  { value: "qr", label: "QR Payment" },
];

const DEFAULT_LIMIT = 20;

/* ---------- helpers ---------- */
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

const safeCSV = (v) => {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
};

const StatusPill = ({ s }) => {
  const variant =
    s === "completed"
      ? "default"
      : ["processing", "ready to pack", "ready to ship"].includes(s)
      ? "secondary"
      : ["pending payment", "payment Not Verified"].includes(s)
      ? "outline"
      : ["Invalid Payment", "cancelled"].includes(s)
      ? "destructive"
      : "outline";
  return (
    <Badge variant={variant} className="capitalize">
      {s}
    </Badge>
  );
};

export default function AdminOrdersPage() {
  // --- Export CSV (selected rows only) ---
  const exportCSV = () => {
    const rowsToExport = rows.filter((r) =>
      selectedIds.includes(String(r._id))
    );
    if (rowsToExport.length === 0) {
      showToast("info", "Select at least one row");
      return;
    }

    const cols = [
      "display_order_id",
      "order_id",
      "customer_name",
      "customer_phone",
      "amount_total",
      "paymentMethod",
      "status",
      "createdAt",
    ];

    const csv = [
      cols.join(","),
      ...rowsToExport.map((r) =>
        [
          safeCSV(r.display_order_id),
          safeCSV(r._id),
          safeCSV(r?.customer?.fullName || r?.customerName || ""),
          safeCSV(r?.customer?.phone || r?.customerPhone || ""),
          Number(r?.amounts?.total || 0),
          safeCSV(r?.paymentMethod || ""),
          safeCSV(r?.status || ""),
          r?.createdAt ? new Date(r.createdAt).toISOString() : "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* filters & search */
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("processing"); // default
  const [methodFilter, setMethodFilter] = useState("__ALL__");

  /* sort + paging (server) */
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  /* data */
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /* row selection */
  const [rowSelection, setRowSelection] = useState({});

  /* visible columns + density */
  const [visibleCols, setVisibleCols] = useState({
    date: true,
    displayId: true,
    customer: true,
    phone: true,
    total: true,
    payment: true,
    status: true,
    actions: true,
  });
  const [density, setDensity] = useState("comfortable");

  /* bulk status inline (no dialog) */
  const [bulkStatus, setBulkStatus] = useState(ORDER_STATUSES[0]);

  /* ------- server fetch ------- */
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting?.[0]
        ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}`
        : "createdAt:desc";

      const params = {
        q: globalFilter || undefined,
        page: pageIndex + 1,
        limit: pageSize,
        sort,
      };

      if (statusFilter && statusFilter !== "__ALL__") {
        params.status = statusFilter;
        params.statuses = [statusFilter];
      }
      if (methodFilter && methodFilter !== "__ALL__") {
        params.paymentMethod = methodFilter;
        params.paymentMethods = [methodFilter];
      }

      const { data } = await axios.get("/api/admin/orders", {
        withCredentials: true,
        params,
        paramsSerializer: { indexes: false },
      });

      if (data?.success) {
        setRows(Array.isArray(data.data?.items) ? data.data.items : []);
        setRowCount(Number(data.data?.total || 0));
        setRowSelection({});
      } else {
        showToast("error", data?.message || "Failed to load orders");
      }
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Failed to load orders"
      );
    } finally {
      setLoading(false);
    }
  }, [globalFilter, pageIndex, pageSize, sorting, statusFilter, methodFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  /* -------- columns (tanstack) -------- */
  const columns = useMemo(
    () =>
      [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
              aria-label="Select all"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label="Select row"
            />
          ),
          enableSorting: false,
          size: 40,
        },
        visibleCols.date && {
          accessorKey: "createdAt",
          header: "Date",
          cell: ({ getValue }) => {
            const v = getValue();
            return v ? new Date(v).toLocaleString() : "—";
          },
        },
        visibleCols.displayId && {
          accessorKey: "display_order_id",
          header: "Display ID",
          cell: ({ row }) => (
            <span className="font-semibold">
              {row.original?.display_order_id || "—"}
            </span>
          ),
        },
        visibleCols.customer && {
          id: "customer",
          header: "Customer",
          cell: ({ row }) =>
            row.original?.customer?.fullName ||
            row.original?.customerName ||
            "—",
        },
        visibleCols.phone && {
          id: "phone",
          header: "Phone",
          cell: ({ row }) =>
            row.original?.customer?.phone || row.original?.customerPhone || "—",
        },
        visibleCols.total && {
          id: "amounts.total",
          header: "Total",
          cell: ({ row }) => (
            <div className="text-right">
              {formatNpr(row.original?.amounts?.total || 0)}
            </div>
          ),
          sortingFn: "alphanumeric",
          enableColumnFilter: false,
        },
        visibleCols.payment && {
          accessorKey: "paymentMethod",
          header: "Payment",
          cell: ({ getValue }) => String(getValue() || "—").toUpperCase(),
        },
        visibleCols.status && {
          accessorKey: "status",
          header: "Status",
          cell: ({ getValue }) => <StatusPill s={getValue() || ""} />,
        },
        visibleCols.actions && {
          id: "actions",
          header: () => <div className="text-right">Actions</div>,
          cell: ({ row }) => <RowActions id={row.original?._id} />,
          enableSorting: false,
        },
      ].filter(Boolean),
    [visibleCols]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(rowCount / pageSize)),
  });

  /* -------- bulk actions -------- */
  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((r) => String(r.original?._id));
  const anySelected = selectedIds.length > 0;

  // inside AdminOrdersPage
  const bulkGenerateInvoices = () => {
    if (selectedIds.length === 0) {
      showToast("info", "Select at least one row");
      return;
    }
    const qs = selectedIds
      .map((id) => `ids=${encodeURIComponent(id)}`)
      .join("&");
    const url = `/api/admin/orders/invoices/preview?${qs}`;
    window.open(url, "_blank", "noopener");
  };

  // helper (near other bulk handlers)
  const bulkPackingListPreview = () => {
    const ids = table
      .getSelectedRowModel()
      .rows.map((r) => String(r.original?._id));
    if (!ids.length) return showToast("info", "Select at least one order");
    const url = `/api/admin/orders/packing-list/preview?ids=${ids.join(
      "&ids="
    )}`;
    window.open(url, "_blank");
  };

const bulkBookPathao = async () => {
  const ids = table.getSelectedRowModel().rows.map(r => String(r.original?._id));
  if (!ids.length) return showToast("info", "Select at least one row");
  try {
    const { data } = await axios.post(
      "/api/admin/orders/pathao/book",
      { ids },
      { withCredentials: true }
    );
    if (data?.success) {
      showToast("success", data.message || `Booked ${ids.length} shipment(s)`);
    } else {
      showToast("error", data?.message || "Booking failed");
      // optionally inspect data.data.failed / data.data.skipped for reasons
      console.log("PATHAO FAIL:", data?.data);
    }
    fetchList(); // refresh your table
  } catch (e) {
    showToast("error", e?.response?.data?.message || e?.message || "Booking failed");
  }
};


  const doBulkStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    try {
      const { data } = await axios.post(
        "/api/admin/orders/bulk-status",
        { ids: selectedIds, status: bulkStatus },
        { withCredentials: true }
      );
      if (data?.success) {
        showToast(
          "success",
          `Changed status for ${selectedIds.length} order(s)`
        );
        fetchList();
      } else {
        showToast("error", data?.message || "Bulk update failed");
      }
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Bulk update failed"
      );
    }
  };

  /* -------- header controls -------- */
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize));

  return (
    <div>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      {/* Header / Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h4 className="text-xl font-semibold mr-3">Orders</h4>

        {/* Global search (server) */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 w-[260px]"
            placeholder="Search display ID, order ID, customer, phone…"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPageIndex(0);
            }}
          />
        </div>

        {/* Payment Method */}
        <Select
          value={methodFilter}
          onValueChange={(v) => {
            setMethodFilter(v);
            setPageIndex(0);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Payment method" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((pm) => (
              <SelectItem key={pm.value} value={pm.value}>
                {pm.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Order Status (default processing) */}
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPageIndex(0);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Order status" />
          </SelectTrigger>
          <SelectContent>
            {/* processing shown only once */}
            <SelectItem value="processing" className="capitalize">
              processing
            </SelectItem>
            <SelectItem value="__ALL__">All statuses</SelectItem>
            {ORDER_STATUSES.filter((s) => s !== "processing").map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort + View */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Sort / View
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { label: "Created (new → old)", id: "createdAt", desc: true },
              { label: "Created (old → new)", id: "createdAt", desc: false },
              { label: "Total (high → low)", id: "amounts.total", desc: true },
              { label: "Total (low → high)", id: "amounts.total", desc: false },
            ].map((opt) => (
              <DropdownMenuItem
                key={`${opt.id}:${String(opt.desc)}`}
                onClick={() => setSorting([{ id: opt.id, desc: opt.desc }])}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Density</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setDensity("comfortable")}>
              Comfortable
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDensity("compact")}>
              Compact
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Columns</DropdownMenuLabel>
            {[
              { key: "date", label: "Date" },
              { key: "displayId", label: "Display ID" },
              { key: "customer", label: "Customer" },
              { key: "phone", label: "Phone" },
              { key: "total", label: "Total" },
              { key: "payment", label: "Payment" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions" },
            ].map((col) => (
              <DropdownMenuItem
                key={col.key}
                onClick={() =>
                  setVisibleCols((prev) => ({
                    ...prev,
                    [col.key]: !prev[col.key],
                  }))
                }
              >
                <Checkbox
                  className="mr-2"
                  checked={!!visibleCols[col.key]}
                  onCheckedChange={(c) =>
                    setVisibleCols((prev) => ({ ...prev, [col.key]: !!c }))
                  }
                />
                {col.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} disabled={!anySelected}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => fetchList()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Selected actions — individual buttons + status dropdown */}
      {anySelected ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 bg-muted/30">
          <div className="text-sm">
            <span className="font-medium">{selectedIds.length}</span> selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={bulkGenerateInvoices}>
              <FileDown className="mr-2 h-4 w-4" />
              Generate Invoices
            </Button>
            <Button variant="outline" onClick={bulkPackingListPreview}>
              Get Packing List
            </Button>

            <Button variant="outline" onClick={bulkBookPathao}>
              <Truck className="mr-2 h-4 w-4" />
              Book Pathao
            </Button>

            <div className="flex items-center gap-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Change status to…" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={doBulkStatus}>Apply</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-muted-foreground">
              Showing {rows.length} / {rowCount}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-5">
          <div className="rounded-lg border overflow-x-auto">
            <UiTable className={density === "compact" ? "text-sm" : ""}>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.id === "amounts.total" ? "text-right" : ""
                        }
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? "cursor-pointer select-none"
                                : ""
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{ asc: " ▲", desc: " ▼" }[
                              header.column.getIsSorted()
                            ] || null}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllLeafColumns().length}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllLeafColumns().length}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={density === "compact" ? "h-10" : ""}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.id === "amounts.total" ||
                            cell.column.id === "actions"
                              ? "text-right"
                              : ""
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UiTable>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Page <span className="font-medium">{pageIndex + 1}</span> of{" "}
              <span className="font-medium">
                {Math.max(1, Math.ceil(rowCount / pageSize))}
              </span>{" "}
              • <span className="font-medium">{rowCount}</span> total
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={pageIndex <= 0 || loading}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                disabled={
                  pageIndex + 1 >=
                    Math.max(1, Math.ceil(rowCount / pageSize)) || loading
                }
                onClick={() => setPageIndex((p) => p + 1)}
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

/* ------------ Per-row Actions: only EDIT icon ------------ */
function RowActions({ id }) {
  return (
    <Button variant="ghost" size="sm" asChild aria-label="Edit order">
      <a href={ADMIN_ORDERS_EDIT(id)}>
        <Pencil className="h-4 w-4" />
      </a>
    </Button>
  );
}
