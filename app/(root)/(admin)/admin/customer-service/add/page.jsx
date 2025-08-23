"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

import { Plus, Trash2, RefreshCw, Save, Info } from "lucide-react";
import { showToast } from "@/lib/ShowToast";

/* ---------------- helpers ---------------- */
const cn = (...a) => a.filter(Boolean).join(" ");
const formatNpr = (v) => {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `Rs. ${n.toLocaleString("en-IN")}`;
  }
};
const debounce = (fn, ms = 350) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// date utils
const addMonths = (d, m) => {
  const date = new Date(d);
  const day = date.getDate();
  date.setMonth(date.getMonth() + m);
  if (date.getDate() < day) date.setDate(0);
  return date;
};
const daysLeftFrom = (startISO, months) => {
  if (!months || months <= 0) return 0;
  const start = new Date(startISO);
  const exp = addMonths(start, months);
  const now = new Date();
  const diff = Math.floor((exp - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
};

/* ---------- Generic Combobox (long-label safe) ---------- */
function ComboBox({
  value,
  onChange,
  options,
  loading,
  onSearch,
  placeholder = "Select…",
  widthClass = "w-full sm:w-[420px]",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const doSearch = useMemo(
    () => debounce((q) => { onSearch && onSearch(q); }, 250),
    [onSearch]
  );

  useEffect(() => {
    if (!open) return;
    doSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const selectedLabel = options.find((o) => String(o.value) === String(value))?.label || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn("justify-between min-w-0 overflow-hidden", widthClass)}>
          <span className={cn(selectedLabel ? "" : "text-muted-foreground", "block truncate text-left min-w-0")}>
            {selectedLabel || placeholder}
          </span>
          <svg className="ml-2 h-4 w-4 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          {onSearch ? <CommandInput placeholder="Search…" value={query} onValueChange={setQuery} /> : null}
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
                      onSelect={() => { onChange(opt.value, opt); setOpen(false); setQuery(""); }}
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

/* -------------------- Page -------------------- */
export default function NewServiceRequestPage() {
  const [activeTab, setActiveTab] = useState("online");

  /* ------- Issues Catalog (category-aware) ------- */
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  const loadIssues = useCallback(async () => {
    setIssuesLoading(true);
    try {
      const { data } = await axios.get("/api/admin/service/issues", {
        withCredentials: true,
        params: { page: 1, limit: 1000, sort: "updatedAt:desc" },
      });
      const list = Array.isArray(data?.data?.items)
        ? data.data.items
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setIssues(list);
    } catch {
      setIssues([]);
    } finally {
      setIssuesLoading(false);
    }
  }, []);
  useEffect(() => { loadIssues(); }, [loadIssues]);

  /* Get category from product payload or fetch */
  const getCatFromProductRaw = (p = {}) => {
    const id =
      p.categoryId ||
      p.category_id ||
      p.category?._id ||
      (typeof p.category === "string" ? p.category : null) ||
      null;
    const name =
      p.categoryName ||
      p.category_name ||
      p.category?.name ||
      "";
    return {
      categoryId: id ? String(id) : null,
      categoryName: String(name || ""),
    };
  };

  const [prodCategoryMap, setProdCategoryMap] = useState({}); // { [productId]: { categoryId, categoryName } }

  const fetchProductCategory = useCallback(async (productId) => {
    if (!productId) return { categoryId: null, categoryName: "" };
    const pid = String(productId);
    if (prodCategoryMap[pid]) return prodCategoryMap[pid];
    try {
      let data;
      try {
        const r = await axios.get(`/api/product/get/${pid}`, { withCredentials: true });
        data = r?.data?.data || r?.data || {};
      } catch {
        const r2 = await axios.get("/api/product", {
          withCredentials: true,
          params: { start: 0, size: 1, filters: "[]", globalFilter: pid, sorting: "[]", deleType: "SD" },
        });
        data = Array.isArray(r2?.data?.data) ? r2.data.data[0] : {};
      }
      const cat = getCatFromProductRaw(data || {});
      setProdCategoryMap((m) => ({ ...m, [pid]: cat }));
      return cat;
    } catch {
      const cat = { categoryId: null, categoryName: "" };
      setProdCategoryMap((m) => ({ ...m, [pid]: cat }));
      return cat;
    }
  }, [prodCategoryMap]);

  /* ------- Shared Intake block ------- */
  const IntakeSection = ({ intake, setIntake }) => {
    const isShipped = ["indrive", "pathao", "courier"].includes(intake.method);
    const paidByIsUs = String(intake.paidBy || "") === "us";

    const onMethodChange = (v) => {
      setIntake((x) =>
        ["indrive", "pathao", "courier"].includes(v)
          ? { ...x, method: v }
          : { ...x, method: v, paidBy: "", amount: "", trackingRef: "" }
      );
    };

    return (
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-4 space-y-1">
          <Label>Received via</Label>
          <Select value={String(intake.method || "")} onValueChange={onMethodChange}>
            <SelectTrigger><SelectValue placeholder="Pick method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Customer came to office</SelectItem>
              <SelectItem value="indrive">InDrive</SelectItem>
              <SelectItem value="pathao">Pathao</SelectItem>
              <SelectItem value="courier">Courier</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isShipped ? (
          <>
            <div className="sm:col-span-3 space-y-1">
              <Label>Paid by</Label>
              <Select
                value={String(intake.paidBy || "")}
                onValueChange={(v) =>
                  setIntake((x) => ({ ...x, paidBy: v, amount: v === "us" ? x.amount : "" }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Who paid?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="us">We paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <Label>Amount (if we paid)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={String(intake.amount || "")}
                onChange={(e) => setIntake((x) => ({ ...x, amount: e.target.value }))}
                placeholder="e.g., 150"
                disabled={!paidByIsUs}
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label>Tracking / Ref</Label>
              <Input
                value={String(intake.trackingRef || "")}
                onChange={(e) => setIntake((x) => ({ ...x, trackingRef: e.target.value }))}
                placeholder="Rider phone / AWB / Ref"
              />
            </div>
          </>
        ) : null}

        <div className="sm:col-span-12 space-y-1">
          <Label>Notes</Label>
          <Textarea
            value={String(intake.notes || "")}
            onChange={(e) => setIntake((x) => ({ ...x, notes: e.target.value }))}
            placeholder="Describe the problem, physical condition, accessories, etc."
            rows={3}
          />
        </div>
      </div>
    );
  };

  /* ================= ONLINE (pick ONE product group + ONE unit) ================= */
  const [wrnOptions, setWrnOptions] = useState([]);
  const [wrnLoading, setWrnLoading] = useState(false);
  const [wrnSel, setWrnSel] = useState("");        // registration id
  const [wrnDetail, setWrnDetail] = useState(null);

  const [groups, setGroups] = useState([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnitKey, setSelectedUnitKey] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [selectedNote, setSelectedNote] = useState("");

  const [onlineIntake, setOnlineIntake] = useState({
    method: "walk-in",
    paidBy: "",
    amount: "",
    trackingRef: "",
    notes: "",
  });
  const [savingOnline, setSavingOnline] = useState(false);

  // SEARCH: Customer Name (Phone) — N items
  const searchWarranty = useCallback(async (q) => {
    if (!q || q.trim().length < 2) return;
    setWrnLoading(true);
    try {
      const { data } = await axios.get("/api/admin/warranty/search", {
        withCredentials: true,
        params: { q, limit: 25 },
      });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.items) ? data.data.items : [];
      setWrnOptions(
        list.map((row) => {
          const name = row?.customerName || row?.customer?.name || "";
          const phone = row?.customerPhone || row?.customer?.phone || "";
          const count = Number(row?.itemsCount ?? (Array.isArray(row?.items) ? row.items.length : 0));
          return {
            value: String(row._id),
            label: `${name}${phone ? ` (${phone})` : ""} — ${count} item${count === 1 ? "" : "s"}`,
            raw: row,
          };
        })
      );
    } catch {
      setWrnOptions([]);
    } finally {
      setWrnLoading(false);
    }
  }, []);

  const groupFromItems = (doc) => {
    const map = new Map();
    const start = doc?.createdAt || new Date().toISOString();
    (doc?.items || []).forEach((it) => {
      const p = it?.product || {};
      const pid = String(p.productId || "");
      const vid = String(p.variantId || "");
      const key = `${pid}__${vid}`;
      const g = map.get(key) || {
        key,
        productId: pid || null,
        variantId: vid || null,
        productName: p.productName || "",
        variantName: p.variantName || "",
        count: 0,
        monthsSet: new Set(),
      };
      g.count += 1;
      const m = Number(it.warrantyMonths || 0) || 0;
      g.monthsSet.add(m);
      map.set(key, g);
    });
    return Array.from(map.values()).map((g) => {
      const months = g.monthsSet.size === 1 ? [...g.monthsSet][0] : null;
      return {
        key: g.key,
        productId: g.productId,
        variantId: g.variantId,
        productName: g.productName,
        variantName: g.variantName,
        count: g.count,
        warrantyMonths: months,
        daysLeft: typeof months === "number" && months > 0 ? daysLeftFrom(start, months) : null,
      };
    });
  };

  const loadWarrantyDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      const { data } = await axios.get(`/api/admin/warranty/${id}`, { withCredentials: true });
      const reg = data?.data || data || null;
      if (!reg) throw new Error("Not found");
      setWrnDetail(reg);

      const list = Array.isArray(reg.summary) && reg.summary.length ? reg.summary : groupFromItems(reg);
      setGroups(list);
      setSelectedGroupKey(list.length === 1 ? list[0].key : "");
      setUnits([]);
      setSelectedUnitKey("");
      setSelectedIssueId("");
      setSelectedNote("");
    } catch (e) {
      setWrnDetail(null);
      setGroups([]);
      setSelectedGroupKey("");
      setUnits([]);
      setSelectedUnitKey("");
      setSelectedIssueId("");
      setSelectedNote("");
      showToast("error", e?.response?.data?.message || e?.message || "Failed to load registration");
    }
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((g) => String(g.key) === String(selectedGroupKey)) || null,
    [groups, selectedGroupKey]
  );

  // Category (id) for selected group (used to filter issues)
  const [selectedGroupCategoryId, setSelectedGroupCategoryId] = useState(null);
  const [selectedGroupCategoryName, setSelectedGroupCategoryName] = useState("");

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      setUnits([]);
      setSelectedUnitKey("");
      setSelectedIssueId("");
      setSelectedNote("");

      if (!wrnDetail || !selectedGroup) {
        setSelectedGroupCategoryId(null);
        setSelectedGroupCategoryName("");
        return;
      }

      // Ensure category for this product
      const cat = await fetchProductCategory(selectedGroup.productId);
      if (!ignore) {
        setSelectedGroupCategoryId(cat.categoryId || null);
        setSelectedGroupCategoryName(cat.categoryName || "");
      }

      // Build unit list (serials) for this group
      const start = wrnDetail?.createdAt || new Date().toISOString();
      const list = (wrnDetail.items || []).filter((it) => {
        const p = it?.product || {};
        return (
          String(p.productId || "") === String(selectedGroup.productId || "") &&
          String(p.variantId || "") === String(selectedGroup.variantId || "")
        );
      });

      const mapped = list.map((it, idx) => {
        const months = Number(
          it.warrantyMonths ??
          selectedGroup.warrantyMonths ??
          wrnDetail.warrantyMonths ??
          0
        ) || 0;
        return {
          key: `${selectedGroup.productId || ""}__${selectedGroup.variantId || ""}__${it.serial || idx}`,
          serial: it.serial || "",
          warrantyMonths: months,
          daysLeft: months > 0 ? daysLeftFrom(start, months) : null,
        };
      });

      if (!ignore) {
        setUnits(mapped);
        setSelectedUnitKey(mapped.length === 1 ? mapped[0].key : "");
      }
    };
    run();
    return () => { ignore = true; };
  }, [wrnDetail, selectedGroup, fetchProductCategory]);

  const selectedUnit = useMemo(
    () => units.find((u) => String(u.key) === String(selectedUnitKey)) || null,
    [units, selectedUnitKey]
  );

  // Filter issues for ONLINE by categoryId only
  const onlineIssues = useMemo(() => {
    const cid = selectedGroupCategoryId && String(selectedGroupCategoryId);
    if (!cid) return issues; // show all until category known
    return issues.filter((it) => it.categoryId && String(it.categoryId) === cid);
  }, [issues, selectedGroupCategoryId]);

  const submitOnline = async () => {
    if (!wrnSel) return showToast("error", "Select a warranty registration");
    if (!selectedGroup) return showToast("error", "Choose the affected product/variant");
    if (!selectedUnit) return showToast("error", "Choose the specific unit (serial)");
    if (!selectedIssueId) return showToast("error", "Pick an issue for the selected unit");

    const chosenIssue = issues.find((i) => String(i._id) === String(selectedIssueId));
    const payload = {
      registrationId: wrnSel,
      items: [
        {
          productId: selectedGroup.productId || null,
          variantId: selectedGroup.variantId || null,
          serial: selectedUnit.serial || "",
          issueId: selectedIssueId || null,
          issueName: chosenIssue?.issueName || "",
          note: selectedNote || "",
        },
      ],
      intake: {
        method: onlineIntake.method,
        paidBy: onlineIntake.paidBy || undefined,
        amount: String(onlineIntake.paidBy || "") === "us" ? Number(onlineIntake.amount || 0) : undefined,
        trackingRef: onlineIntake.trackingRef || undefined,
        notes: onlineIntake.notes || "",
      },
    };

    if (payload.intake.paidBy === "us" && !(payload.intake.amount > 0)) {
      return showToast("error", "Enter a valid amount (> 0) since we paid.");
    }

    setSavingOnline(true);
    try {
      const { data } = await axios.post("/api/admin/service/requests/online", payload, { withCredentials: true });
      if (data?.success) {
        showToast("success", "Online service request created");
        // reset
        setWrnSel("");
        setWrnDetail(null);
        setGroups([]);
        setSelectedGroupKey("");
        setSelectedGroupCategoryId(null);
        setSelectedGroupCategoryName("");
        setUnits([]);
        setSelectedUnitKey("");
        setSelectedIssueId("");
        setSelectedNote("");
        setOnlineIntake({ method: "walk-in", paidBy: "", amount: "", trackingRef: "", notes: "" });
      } else {
        showToast("error", data?.message || "Failed to create");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to create");
    } finally {
      setSavingOnline(false);
    }
  };

  /* ================= OFFLINE (category-aware issues per row) ================= */
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopId, setShopId] = useState("");

  const [offlineCustomer, setOfflineCustomer] = useState({ name: "", phone: "" });

  const [offIntake, setOffIntake] = useState({
    method: "walk-in",
    paidBy: "",
    amount: "",
    trackingRef: "",
    notes: "",
  });

  const [offRows, setOffRows] = useState([
    { _key: `row-0`, productId: "", productName: "", variantId: "", variantName: "", serial: "", issueId: "", note: "", categoryId: null, categoryName: "" },
  ]);
  const [savingOffline, setSavingOffline] = useState(false);

  const loadShops = useCallback(async () => {
    setShopsLoading(true);
    try {
      const { data } = await axios.get("/api/admin/offline-shops", {
        withCredentials: true,
        params: { page: 1, limit: 200, sort: "name:asc" },
      });
      const items = Array.isArray(data?.data?.items) ? data.data.items : [];
      setShops(items);
    } catch {
      setShops([]);
    } finally {
      setShopsLoading(false);
    }
  }, []);
  useEffect(() => { loadShops(); }, [loadShops]);

  // product search for offline rows
  const [prodOpts, setProdOpts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);

  const searchProducts = useCallback(async (q) => {
    if (!q || q.trim().length < 2) return;
    setProdLoading(true);
    try {
      const { data } = await axios.get("/api/product", {
        withCredentials: true,
        params: { start: 0, size: 20, filters: "[]", globalFilter: q, sorting: "[]", deleType: "SD" },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      setProdOpts(list.map((p) => ({
        value: String(p._id || p.id),
        label: `${p.name || p.productName} — ${formatNpr(p.specialPrice || p.mrp || 0)}`,
        raw: p,
      })));
    } catch {
      setProdOpts([]);
    } finally {
      setProdLoading(false);
    }
  }, []);

  const [variantMap, setVariantMap] = useState({}); // productId => {loading, options: []}
  const loadVariantsForProduct = useCallback(async (productId) => {
    if (!productId) return [];
    setVariantMap((m) => ({ ...m, [productId]: { ...(m[productId] || {}), loading: true } }));
    try {
      const { data } = await axios.get("/api/product-variant", {
        withCredentials: true,
        params: { start: 0, size: 60, filters: "[]", globalFilter: productId, sorting: "[]", deleType: "SD" },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      const opts = list.map((v) => ({ value: String(v._id), label: v.variantName || v.name || "Variant", raw: v }));
      setVariantMap((m) => ({ ...m, [productId]: { loading: false, options: opts } }));
      return opts;
    } catch {
      setVariantMap((m) => ({ ...m, [productId]: { loading: false, options: [] } }));
      return [];
    }
  }, []);

  const setOffField = (idx, patch) =>
    setOffRows((prev) => {
      const next = [...prev];
      if (!next[idx]) return prev;
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const addOffRow = () =>
    setOffRows((prev) => [
      ...prev,
      { _key: `row-${Date.now()}`, productId: "", productName: "", variantId: "", variantName: "", serial: "", issueId: "", note: "", categoryId: null, categoryName: "" },
    ]);

  const delOffRow = (idx) => setOffRows((prev) => prev.filter((_, i) => i !== idx));

  // issues list per-row (filter by categoryId only)
  const issuesForRow = useCallback((row) => {
    const cid = row?.categoryId && String(row.categoryId);
    if (!cid) return issues; // until category known
    return issues.filter((it) => it.categoryId && String(it.categoryId) === cid);
  }, [issues]);

  // When product selected offline, set category from raw; if missing, fetch
  const onPickOfflineProduct = useCallback(async (idx, val, raw) => {
    const cat = getCatFromProductRaw(raw || {});
    setOffField(idx, {
      productId: val,
      productName: raw?.name || raw?.productName || "",
      variantId: "",
      variantName: "",
      issueId: "",
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
    });
    // also store in cache
    setProdCategoryMap((m) => ({ ...m, [String(val)]: cat }));
    // if no categoryId, fetch it
    if (!cat.categoryId) {
      const fetched = await fetchProductCategory(val);
      setOffField(idx, {
        categoryId: fetched.categoryId,
        categoryName: fetched.categoryName,
      });
    }
    await loadVariantsForProduct(val);
  }, [fetchProductCategory, loadVariantsForProduct]);

  const submitOffline = async () => {
    if (!shopId) return showToast("error", "Select a shop");
    if (!offlineCustomer.name?.trim()) return showToast("error", "Enter customer name");
    if (!offlineCustomer.phone?.trim()) return showToast("error", "Enter customer phone");

    const filled = offRows.filter((r) => r.productId && (r.issueId || r.note));
    if (filled.length === 0) return showToast("error", "Add at least one product + issue");

    const payload = {
      shopId,
      customer: { name: offlineCustomer.name.trim(), phone: offlineCustomer.phone.trim() },
      items: filled.map((r) => {
        const issue = issues.find((i) => String(i._id) === String(r.issueId));
        return {
          productId: r.productId,
          variantId: r.variantId || null,
          serial: r.serial || "",
          issueId: r.issueId || null,
          issueName: issue?.issueName || "",
          note: r.note || "",
        };
      }),
      intake: {
        method: offIntake.method,
        paidBy: offIntake.paidBy || undefined,
        amount: String(offIntake.paidBy || "") === "us" ? Number(offIntake.amount || 0) : undefined,
        trackingRef: offIntake.trackingRef || undefined,
        notes: offIntake.notes || "",
      },
    };

    if (payload.intake.paidBy === "us" && !(payload.intake.amount > 0)) {
      return showToast("error", "Enter a valid amount (> 0) since we paid.");
    }

    setSavingOffline(true);
    try {
      const { data } = await axios.post("/api/admin/service/requests/offline", payload, { withCredentials: true });
      if (data?.success) {
        showToast("success", "Offline service request created");
        // reset
        setShopId("");
        setOfflineCustomer({ name: "", phone: "" });
        setOffIntake({ method: "walk-in", paidBy: "", amount: "", trackingRef: "", notes: "" });
        setOffRows([{ _key: `row-0`, productId: "", productName: "", variantId: "", variantName: "", serial: "", issueId: "", note: "", categoryId: null, categoryName: "" }]);
      } else {
        showToast("error", data?.message || "Failed to create");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to create");
    } finally {
      setSavingOffline(false);
    }
  };

  /* -------------- UI -------------- */
  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">New Service Request</h1>
        <Badge variant="secondary">Online & Offline</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="online">Online</TabsTrigger>
          <TabsTrigger value="offline">Offline</TabsTrigger>
        </TabsList>

        {/* ---------------------- ONLINE TAB ---------------------- */}
        <TabsContent value="online" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="font-semibold">Select Warranty Registration</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <ComboBox
                  value={wrnSel}
                  onChange={(val) => { setWrnSel(val); if (val) loadWarrantyDetail(val); }}
                  options={wrnOptions}
                  loading={wrnLoading}
                  onSearch={searchWarranty}
                  placeholder="Search by customer name / phone / serial…"
                  widthClass="w-full sm:w-[560px]"
                />
                <Button variant="outline" onClick={() => wrnSel && loadWarrantyDetail(wrnSel)} disabled={!wrnSel}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload
                </Button>
              </div>

              {wrnDetail ? (
                <div className="rounded border p-3 bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 opacity-70" />
                    <div className="font-medium">Warranty Details</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Customer</div>
                      <div className="font-medium">
                        {wrnDetail?.customer?.name || "—"}
                        {wrnDetail?.customer?.phone ? ` (${wrnDetail.customer.phone})` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Items</div>
                      <div className="font-medium">{Array.isArray(wrnDetail?.items) ? wrnDetail.items.length : 0}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Channel / Shop</div>
                      <div className="font-medium">
                        {(wrnDetail?.channel || "").toUpperCase()} {wrnDetail?.shopName ? `• ${wrnDetail.shopName}` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Created</div>
                      <div className="font-medium">{wrnDetail?.createdAt ? new Date(wrnDetail.createdAt).toLocaleString() : "—"}</div>
                    </div>
                  </div>

                  {/* Group + Unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="space-y-1">
                      <Label>Affected product</Label>
                      <Select value={String(selectedGroupKey || "")} onValueChange={(v) => setSelectedGroupKey(v)}>
                        <SelectTrigger className="w-full sm:w-[420px]">
                          <SelectValue placeholder="Choose product + variant" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px]">
                          {(groups || []).map((g) => (
                            <SelectItem key={g.key} value={String(g.key)}>
                              {g.productName}{g.variantName ? ` (${g.variantName})` : ""} × {g.count}
                              {typeof g.warrantyMonths === "number" ? ` — ${g.warrantyMonths} mo` : ""}
                              {typeof g.daysLeft === "number" ? ` • ${g.daysLeft}d left` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedGroupCategoryName ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          Issues filtered by: <span className="font-medium">{selectedGroupCategoryName}</span>
                        </div>
                      ) : null}
                    </div>

                    {selectedGroup ? (
                      <div className="space-y-1">
                        <Label>Specific unit</Label>
                        <Select value={String(selectedUnitKey || "")} onValueChange={(v) => setSelectedUnitKey(v)}>
                          <SelectTrigger className="w-full sm:w-[420px]">
                            <SelectValue placeholder="Choose unit (serial)" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[320px]">
                            {(units || []).map((u) => (
                              <SelectItem key={u.key} value={String(u.key)}>
                                {u.serial ? `SN: ${u.serial}` : "No serial"}
                                {typeof u.warrantyMonths === "number" ? ` — ${u.warrantyMonths} mo` : ""}
                                {typeof u.daysLeft === "number" ? ` • ${u.daysLeft}d left` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>

                  {/* Issue + Note (filtered by categoryId) */}
                  {selectedGroup && selectedUnit ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-2">
                      <div className="sm:col-span-5 space-y-1">
                        <Label>Issue</Label>
                        <Select value={String(selectedIssueId || "")} onValueChange={(v) => setSelectedIssueId(v)}>
                          <SelectTrigger><SelectValue placeholder="Pick issue" /></SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {issuesLoading ? (
                              <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                            ) : onlineIssues.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">No issues for this category</div>
                            ) : (
                              onlineIssues.map((it) => (
                                <SelectItem key={it._id} value={String(it._id)}>
                                  {it.issueName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-7 space-y-1">
                        <Label>Note (optional)</Label>
                        <Input value={selectedNote} onChange={(e) => setSelectedNote(e.target.value)} placeholder="Notes (optional)" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Intake */}
          <Card>
            <CardHeader><div className="font-semibold">Intake</div></CardHeader>
            <CardContent>
              <IntakeSection intake={onlineIntake} setIntake={setOnlineIntake} />
              <div className="mt-4">
                <Button
                  onClick={submitOnline}
                  disabled={!wrnSel || !selectedGroup || !selectedUnit || !selectedIssueId || savingOnline}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingOnline ? "Saving…" : "Create Online Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------- OFFLINE TAB ---------------------- */}
        <TabsContent value="offline" className="mt-4 space-y-6">
          {/* Shop + Customer */}
          <Card>
            <CardHeader><div className="font-semibold">Shop & Customer</div></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4 space-y-1">
                <Label>Shop</Label>
                <Select value={String(shopId || "")} onValueChange={(v) => setShopId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select shop" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {shopsLoading ? (
                      <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                    ) : shops.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No shops</div>
                    ) : (
                      shops.map((s) => (
                        <SelectItem key={s._id} value={String(s._id)}>
                          {s.name}{s.location ? ` — ${s.location}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-4 space-y-1">
                <Label>Customer Name</Label>
                <Input value={offlineCustomer.name} onChange={(e) => setOfflineCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="Name" />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <Label>Customer Phone</Label>
                <Input value={offlineCustomer.phone} onChange={(e) => setOfflineCustomer((c) => ({ ...c, phone: e.target.value }))} placeholder="98XXXXXXXX" />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-semibold">Products with Issues</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={addOffRow}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <UiTable className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[320px]">Product</TableHead>
                      <TableHead className="min-w-[240px]">Variant</TableHead>
                      <TableHead className="min-w-[200px]">Serial</TableHead>
                      <TableHead className="min-w-[240px]">Issue</TableHead>
                      <TableHead className="min-w-[240px]">Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No rows.</TableCell>
                      </TableRow>
                    ) : (
                      offRows.map((r, idx) => {
                        const vmap = variantMap[r.productId] || { loading: false, options: [] };
                        const rowIssues = issuesForRow(r);
                        return (
                          <TableRow key={r._key}>
                            {/* Product */}
                            <TableCell className="min-w-[320px]">
                              <ComboBox
                                value={r.productId}
                                onChange={async (val, opt) => {
                                  const raw = opt?.raw || {};
                                  await onPickOfflineProduct(idx, val, raw);
                                }}
                                options={prodOpts}
                                loading={prodLoading}
                                onSearch={searchProducts}
                                placeholder="Search product…"
                                widthClass="w-full sm:w-[360px]"
                              />
                              {r.categoryName ? (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Issues filtered by: <span className="font-medium">{r.categoryName}</span>
                                </div>
                              ) : null}
                            </TableCell>

                            {/* Variant */}
                            <TableCell className="min-w-[240px]">
                              <Select
                                value={String(r.variantId || "")}
                                onValueChange={(v) => {
                                  const opts = (variantMap[r.productId]?.options || []);
                                  setOffField(idx, {
                                    variantId: v,
                                    variantName: opts.find((o) => String(o.value) === String(v))?.label || "",
                                  });
                                }}
                                disabled={!r.productId}
                              >
                                <SelectTrigger className="w-full sm:w-[260px]">
                                  <SelectValue placeholder={vmap.loading ? "Loading…" : "Optional"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[260px]">
                                  {(vmap.options || []).length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground">
                                      {vmap.loading ? "Loading…" : "No variants"}
                                    </div>
                                  ) : (
                                    vmap.options.map((o) => (
                                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Serial */}
                            <TableCell className="min-w-[200px]">
                              <Input value={r.serial} onChange={(e) => setOffField(idx, { serial: e.target.value })} placeholder="Serial (optional)" />
                            </TableCell>

                            {/* Issue (filtered, label without category name) */}
                            <TableCell className="min-w-[240px]">
                              <Select
                                value={String(r.issueId || "")}
                                onValueChange={(v) => setOffField(idx, { issueId: v })}
                              >
                                <SelectTrigger className="w-full sm:w-[260px]">
                                  <SelectValue placeholder="Pick issue" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {issuesLoading ? (
                                    <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                                  ) : rowIssues.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground">No issues for this category</div>
                                  ) : (
                                    rowIssues.map((it) => (
                                      <SelectItem key={it._id} value={String(it._id)}>
                                        {it.issueName}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Note */}
                            <TableCell className="min-w-[240px]">
                              <Input value={r.note} onChange={(e) => setOffField(idx, { note: e.target.value })} placeholder="Note (optional)" />
                            </TableCell>

                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => delOffRow(idx)} disabled={offRows.length === 1}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </UiTable>
              </div>
            </CardContent>
          </Card>

          {/* Intake */}
          <Card>
            <CardHeader><div className="font-semibold">Intake</div></CardHeader>
            <CardContent>
              <IntakeSection intake={offIntake} setIntake={setOffIntake} />
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" onClick={loadShops}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Shops
                </Button>
                <Button onClick={submitOffline} disabled={savingOffline}>
                  <Save className="h-4 w-4 mr-2" />
                  {savingOffline ? "Saving…" : "Create Offline Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
