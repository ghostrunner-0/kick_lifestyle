"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Separator } from "@/components/ui/separator";

import {
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Info,
  PackageOpen,
  ClipboardList,
} from "lucide-react";
import { showToast } from "@/lib/ShowToast";

/* ---------------- helpers ---------------- */
const cn = (...a) => a.filter(Boolean).join(" ");
const debounce = (fn, ms = 350) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};
const onlyDigits = (str) => (str || "").replace(/\D+/g, "");
const parseAmountInput = (v) => onlyDigits(v);
const stopWheelChange = (e) => {
  e.target.blur();
  setTimeout(() => e.target && e.target.focus?.(), 0);
};
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

/* date utils for display only */
const addMonths = (d, m) => {
  const date = new Date(d);
  const day = date.getDate();
  date.setMonth(date.getMonth() + m);
  if (date.getDate() < day) date.setDate(0);
  return date;
};
const daysLeftFrom = (startISO, months) => {
  if (!months || months <= 0) return null;
  const start = new Date(startISO);
  const exp = addMonths(start, months);
  const now = new Date();
  const diff = Math.floor((exp - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
};

/* ---------- Chips input for serials ---------- */
function ChipsInput({ value = [], onChange, placeholder = "Add serial and press Enter" }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const addChip = (t) => {
    const v = String(t || "").trim();
    if (!v) return;
    const next = Array.from(new Set([...(value || []), v]));
    onChange?.(next);
    setText("");
  };

  const removeChip = (idx) => {
    const next = (value || []).filter((_, i) => i !== idx);
    onChange?.(next);
  };

  return (
    <div className="flex min-h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-2 py-1">
      <div className="flex flex-wrap gap-1">
        {(value || []).map((s, idx) => (
          <span
            key={`${s}-${idx}`}
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium"
          >
            {s}
            <button
              type="button"
              className="ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => removeChip(idx)}
              aria-label={`Remove ${s}`}
              title="Remove"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addChip(text);
          } else if (e.key === "Backspace" && !text && (value || []).length) {
            removeChip((value || []).length - 1);
          }
        }}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm"
      />
    </div>
  );
}

/* ---------- Generic Combobox (stable label while searching) ---------- */
function ComboBox({
  value,
  onChange,
  options,
  loading,
  onSearch,
  placeholder = "Select…",
  widthClass = "w-full",
  selectedLabelOverride, // fix: show this label even if options doesn’t contain selected value
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
    if (!open) return;
    doSearch(query);
  }, [query, open, doSearch]);

  const fallbackLabel =
    options.find((o) => String(o.value) === String(value))?.label || "";
  const selectedLabel = selectedLabelOverride ?? fallbackLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "justify-between min-w-0 overflow-hidden h-10 rounded-lg",
            widthClass
          )}
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

/* ---------- Intake Block (matches schemas: method, payer, amount, reference) ---------- */
function IntakeSection({ intake, setIntake, compact = false }) {
  const isRider = ["indrive", "pathao"].includes(intake.method);
  const payerIsUs = String(intake.payer || "") === "us";

  const onMethodChange = (v) => {
    setIntake((x) =>
      ["indrive", "pathao", "courier", "walkin"].includes(v)
        ? { ...x, method: v }
        : x
    );
    // If switching away from rider apps, keep fields but they’re optional; schema requires payer only for indrive/pathao
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        compact ? "sm:grid-cols-3" : "sm:grid-cols-12"
      )}
    >
      <div className={compact ? "" : "sm:col-span-3"}>
        <Label>Received via</Label>
        <Select value={String(intake.method || "")} onValueChange={onMethodChange}>
          <SelectTrigger><SelectValue placeholder="Pick method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="walkin">Walk-in</SelectItem>
            <SelectItem value="indrive">InDrive</SelectItem>
            <SelectItem value="pathao">Pathao</SelectItem>
            <SelectItem value="courier">Courier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isRider ? (
        <>
          <div className={compact ? "" : "sm:col-span-3"}>
            <Label>Who paid</Label>
            <Select
              value={String(intake.payer || "")}
              onValueChange={(v) =>
                setIntake((x) => ({
                  ...x,
                  payer: v,
                  amount: v === "us" ? x.amount : "", // keep amount only if “us”
                }))
              }
            >
              <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="us">We paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={compact ? "" : "sm:col-span-3"}>
            <Label>Amount (if we paid)</Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              autoComplete="off"
              value={String(intake.amount ?? "")}
              onChange={(e) =>
                setIntake((x) => ({ ...x, amount: parseAmountInput(e.target.value) }))
              }
              onWheel={stopWheelChange}
              placeholder="e.g., 150"
              disabled={!payerIsUs}
            />
          </div>

          <div className={compact ? "" : "sm:col-span-3"}>
            <Label>Reference (optional)</Label>
            <Input
              value={String(intake.reference ?? "")}
              onChange={(e) =>
                setIntake((x) => ({ ...x, reference: e.target.value }))
              }
              placeholder="Rider/Ref/AWB"
            />
          </div>
        </>
      ) : (
        <>
          <div className={compact ? "" : "sm:col-span-3"}>
            <Label>Reference (optional)</Label>
            <Input
              value={String(intake.reference ?? "")}
              onChange={(e) =>
                setIntake((x) => ({ ...x, reference: e.target.value }))
              }
              placeholder="Tracking no. / Ref"
            />
          </div>
          <div className={compact ? "" : "sm:col-span-3"}>
            <Label className="text-muted-foreground">—</Label>
            <div className="text-sm text-muted-foreground">
              No payer needed for {intake.method || "this"}.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------- Page -------------------- */
export default function ServiceRequestsNew() {
  const [activeTab, setActiveTab] = useState("online");

  /* ---------- Common data: issues ---------- */
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

  /* ---------- Category helpers ---------- */
  const getCatFromProductRaw = (p = {}) => {
    const id =
      p.categoryId ||
      p.category_id ||
      p.category?._id ||
      (typeof p.category === "string" ? p.category : null) ||
      null;
    const name = p.categoryName || p.category_name || p.category?.name || "";
    return { categoryId: id ? String(id) : null, categoryName: String(name || "") };
  };
  const [prodCategoryMap, setProdCategoryMap] = useState({});
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

  /* ================= ONLINE ================= */
  const [wrnOptions, setWrnOptions] = useState([]);
  const [wrnLoading, setWrnLoading] = useState(false);
  const [wrnSel, setWrnSel] = useState("");             // registration id
  const [wrnSelLabel, setWrnSelLabel] = useState("");   // stable label
  const [wrnDetail, setWrnDetail] = useState(null);

  const [groups, setGroups] = useState([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnitKey, setSelectedUnitKey] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [selectedItemNotes, setSelectedItemNotes] = useState("");

  const [selectedGroupCategoryId, setSelectedGroupCategoryId] = useState(null);
  const [selectedGroupCategoryName, setSelectedGroupCategoryName] = useState("");

  const [onlineIntake, setOnlineIntake] = useState({
    method: "walkin",
    payer: "",
    amount: "",
    reference: "",
  });
  const [onlineAdminNote, setOnlineAdminNote] = useState("");
  const [savingOnline, setSavingOnline] = useState(false);

  const searchWarranty = useCallback(async (q) => {
    if (!q || q.trim().length < 2) return;
    setWrnLoading(true);
    try {
      const { data } = await axios.get("/api/admin/warranty/search", {
        withCredentials: true,
        params: { q, limit: 25 },
      });
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.items)
        ? data.data.items
        : [];
      setWrnOptions(
        list.map((row) => {
          const name = row?.customerName || row?.customer?.name || "";
          const phone = row?.customerPhone || row?.customer?.phone || "";
          const count = Number(
            row?.itemsCount ?? (Array.isArray(row?.items) ? row.items.length : 0)
          );
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
      const g =
        map.get(key) || {
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
        daysLeft:
          typeof months === "number" && months > 0
            ? daysLeftFrom(start, months)
            : null,
      };
    });
  };

  const loadWarrantyDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      const { data } = await axios.get(`/api/admin/warranty/${id}`, {
        withCredentials: true,
      });
      const reg = data?.data || data || null;
      if (!reg) throw new Error("Not found");
      setWrnDetail(reg);

      const list =
        Array.isArray(reg.summary) && reg.summary.length
          ? reg.summary
          : groupFromItems(reg);
      setGroups(list);
      setSelectedGroupKey(list.length === 1 ? list[0].key : "");
      setUnits([]);
      setSelectedUnitKey("");
      setSelectedIssueId("");
      setSelectedItemNotes("");
    } catch (e) {
      setWrnDetail(null);
      setGroups([]);
      setSelectedGroupKey("");
      setUnits([]);
      setSelectedUnitKey("");
      setSelectedIssueId("");
      setSelectedItemNotes("");
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Failed to load registration"
      );
    }
  }, []);

  const selectedGroup = useMemo(
    () =>
      groups.find((g) => String(g.key) === String(selectedGroupKey)) || null,
    [groups, selectedGroupKey]
  );

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      setUnits([]);
      setSelectedUnitKey("");
      setSelectedIssueId("");
      setSelectedItemNotes("");

      if (!wrnDetail || !selectedGroup) {
        setSelectedGroupCategoryId(null);
        setSelectedGroupCategoryName("");
        return;
      }

      const cat = await fetchProductCategory(selectedGroup.productId);
      if (!ignore) {
        setSelectedGroupCategoryId(cat.categoryId || null);
        setSelectedGroupCategoryName(cat.categoryName || "");
      }

      const start = wrnDetail?.createdAt || new Date().toISOString();
      const list = (wrnDetail.items || []).filter((it) => {
        const p = it?.product || {};
        return (
          String(p.productId || "") === String(selectedGroup.productId || "") &&
          String(p.variantId || "") === String(selectedGroup.variantId || "")
        );
      });

      const mapped = list.map((it, idx) => {
        const months =
          Number(
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

  const onlineIssues = useMemo(() => {
    const cid = selectedGroupCategoryId && String(selectedGroupCategoryId);
    if (!cid) return issues;
    return issues.filter((it) => it.categoryId && String(it.categoryId) === cid);
  }, [issues, selectedGroupCategoryId]);

  const submitOnline = async () => {
    if (!wrnSel) return showToast("error", "Select a warranty registration");
    if (!selectedGroup) return showToast("error", "Choose product/variant");
    if (!selectedUnit) return showToast("error", "Choose the specific unit");
    if (!selectedIssueId) return showToast("error", "Pick an issue");

    // Schema: payer required for indrive/pathao
    if (["indrive", "pathao"].includes(onlineIntake.method) && !onlineIntake.payer) {
      return showToast("error", "Select who paid (payer) for InDrive/Pathao.");
    }

    const amount =
      String(onlineIntake.payer || "") === "us"
        ? Number(onlineIntake.amount || 0)
        : undefined;
    if (onlineIntake.payer === "us" && !(amount > 0)) {
      return showToast("error", "Enter a valid amount (> 0) since we paid.");
    }

    const chosenIssue = issues.find((i) => String(i._id) === String(selectedIssueId));

    // Online schema requires customer snapshot; we use WR payload
    const customer = {
      name: wrnDetail?.customer?.name || "",
      phone: wrnDetail?.customer?.phone || "",
    };
    if (!customer.name || !customer.phone) {
      return showToast("error", "Selected registration has missing customer details.");
    }

    // Item serials: schema expects array `serials`
    const serials = selectedUnit?.serial ? [selectedUnit.serial] : [];

    const payload = {
      channel: "online",
      userId: wrnDetail?.userId || null,
      orderId: wrnDetail?.orderId || null,
      warrantyRegistrationId: wrnSel,
      customer,
      intake: {
        method: onlineIntake.method,
        payer: onlineIntake.payer || null,
        amount: amount ?? 0,
        reference: onlineIntake.reference?.trim() || "",
      },
      items: [
        {
          warrantyRegistrationId: wrnSel,
          productId: selectedGroup.productId || null,
          variantId: selectedGroup.variantId || null,
          productName: selectedGroup.productName || "",
          variantName: selectedGroup.variantName || "",
          serials,
          issueId: selectedIssueId || null,
          issueName: chosenIssue?.issueName || "",
          categoryName: selectedGroupCategoryName || "",
          notes: selectedItemNotes || "",
        },
      ],
      status: "received",
      adminNote: onlineAdminNote || "",
      attachments: [],
    };

    setSavingOnline(true);
    try {
      const { data } = await axios.post("/api/admin/service/requests/online", payload, { withCredentials: true });
      if (data?.success) {
        showToast("success", "Online service request created");
        // reset
        setWrnSel(""); setWrnSelLabel(""); setWrnDetail(null);
        setGroups([]); setSelectedGroupKey(""); setUnits([]); setSelectedUnitKey("");
        setSelectedIssueId(""); setSelectedItemNotes("");
        setSelectedGroupCategoryId(null); setSelectedGroupCategoryName("");
        setOnlineIntake({ method: "walkin", payer: "", amount: "", reference: "" });
        setOnlineAdminNote("");
      } else {
        showToast("error", data?.message || "Failed to create");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to create");
    } finally {
      setSavingOnline(false);
    }
  };

  /* ================= OFFLINE ================= */
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopId, setShopId] = useState("");

  const [offlineCustomer, setOfflineCustomer] = useState({ name: "", phone: "" });
  const [offIntake, setOffIntake] = useState({ method: "walkin", payer: "", amount: "", reference: "" });
  const [offAdminNote, setOffAdminNote] = useState("");

  const [prodOpts, setProdOpts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [variantMap, setVariantMap] = useState({}); // productId => {loading, options: []}

  const [offRows, setOffRows] = useState([
    {
      _key: `row-0`,
      productId: "",
      productName: "",
      variantId: "",
      variantName: "",
      serials: [],
      issueId: "",
      issueName: "",
      categoryId: null,
      categoryName: "",
      notes: "",
    },
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

  const searchProducts = useCallback(async (q) => {
    if (!q || q.trim().length < 2) return;
    setProdLoading(true);
    try {
      const { data } = await axios.get("/api/product", {
        withCredentials: true,
        params: {
          start: 0, size: 20, filters: "[]", globalFilter: q, sorting: "[]", deleType: "SD",
        },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      setProdOpts(
        list.map((p) => ({
          value: String(p._id || p.id),
          label: `${p.name || p.productName} — ${formatNpr(p.specialPrice || p.mrp || 0)}`,
          raw: p,
        }))
      );
    } catch {
      setProdOpts([]);
    } finally {
      setProdLoading(false);
    }
  }, []);

  const loadVariantsForProduct = useCallback(async (productId) => {
    if (!productId) return [];
    setVariantMap((m) => ({ ...m, [productId]: { ...(m[productId] || {}), loading: true } }));
    try {
      const { data } = await axios.get("/api/product-variant", {
        withCredentials: true,
        params: { start: 0, size: 60, filters: "[]", globalFilter: productId, sorting: "[]", deleType: "SD" },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      const opts = list.map((v) => ({
        value: String(v._id), label: v.variantName || v.name || "Variant", raw: v,
      }));
      setVariantMap((m) => ({ ...m, [productId]: { loading: false, options: opts } }));
      return opts;
    } catch {
      setVariantMap((m) => ({ ...m, [productId]: { loading: false, options: [] } }));
      return [];
    }
  }, []);

  const addOffRow = () =>
    setOffRows((prev) => [
      ...prev,
      {
        _key: `row-${Date.now()}`,
        productId: "",
        productName: "",
        variantId: "",
        variantName: "",
        serials: [],
        issueId: "",
        issueName: "",
        categoryId: null,
        categoryName: "",
        notes: "",
      },
    ]);
  const delOffRow = (idx) =>
    setOffRows((prev) => prev.filter((_, i) => i !== idx));
  const setOffField = (idx, patch) =>
    setOffRows((prev) => {
      const next = [...prev];
      if (!next[idx]) return prev;
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const issuesForRow = useCallback(
    (row) => {
      const cid = row?.categoryId && String(row.categoryId);
      if (!cid) return issues;
      return issues.filter((it) => it.categoryId && String(it.categoryId) === cid);
    },
    [issues]
  );

  const onPickOfflineProduct = useCallback(
    async (idx, val, raw) => {
      const cat = getCatFromProductRaw(raw || {});
      setOffField(idx, {
        productId: val,
        productName: raw?.name || raw?.productName || "",
        variantId: "",
        variantName: "",
        issueId: "",
        issueName: "",
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
      });
      setProdCategoryMap((m) => ({ ...m, [String(val)]: cat }));
      if (!cat.categoryId) {
        const fetched = await fetchProductCategory(val);
        setOffField(idx, { categoryId: fetched.categoryId, categoryName: fetched.categoryName });
      }
      await loadVariantsForProduct(val);
    },
    [fetchProductCategory, loadVariantsForProduct]
  );

  const submitOffline = async () => {
    if (!shopId) return showToast("error", "Select a shop");

    // For rider apps, payer is required
    if (["indrive", "pathao"].includes(offIntake.method) && !offIntake.payer) {
      return showToast("error", "Select who paid (payer) for InDrive/Pathao.");
    }
    const amount =
      String(offIntake.payer || "") === "us"
        ? Number(offIntake.amount || 0)
        : undefined;
    if (offIntake.payer === "us" && !(amount > 0)) {
      return showToast("error", "Enter a valid amount (> 0) since we paid.");
    }

    const filled = offRows.filter(
      (r) => r.productId && (r.issueId || r.issueName) && (r.serials || []).length > 0
    );
    if (filled.length === 0) {
      return showToast("error", "Add at least one product, one issue and at least one serial.");
    }

    const payload = {
      channel: "offline",
      shopId,
      shop: {}, // your API can fill snapshot from shopId; leave as {}
      customer: (offlineCustomer.name?.trim() || offlineCustomer.phone?.trim())
        ? {
            name: offlineCustomer.name?.trim() || "",
            phone: offlineCustomer.phone?.trim() || "",
          }
        : undefined,
      intake: {
        method: offIntake.method,
        payer: offIntake.payer || null,
        amount: amount ?? 0,
        reference: offIntake.reference?.trim() || "",
      },
      items: filled.map((r) => {
        const issue = issues.find((i) => String(i._id) === String(r.issueId));
        return {
          productId: r.productId || null,
          variantId: r.variantId || null,
          productName: r.productName || "",
          variantName: r.variantName || "",
          serials: r.serials || [],
          issueId: r.issueId || null,
          issueName: r.issueName || issue?.issueName || "",
          categoryName: r.categoryName || "",
          notes: r.notes || "",
        };
      }),
      status: "received",
      adminNote: offAdminNote || "",
      attachments: [],
    };

    setSavingOffline(true);
    try {
      const { data } = await axios.post("/api/admin/service/requests/offline", payload, { withCredentials: true });
      if (data?.success) {
        showToast("success", "Offline service request created");
        // reset
        setShopId("");
        setOfflineCustomer({ name: "", phone: "" });
        setOffIntake({ method: "walkin", payer: "", amount: "", reference: "" });
        setOffAdminNote("");
        setOffRows([
          {
            _key: `row-0`,
            productId: "",
            productName: "",
            variantId: "",
            variantName: "",
            serials: [],
            issueId: "",
            issueName: "",
            categoryId: null,
            categoryName: "",
            notes: "",
          },
        ]);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">New Service Request</h1>
          <Badge variant="secondary" className="hidden sm:flex">Online & Offline</Badge>
        </div>
        <div className="hidden sm:flex gap-2">
          <a href="#online" className="text-sm text-muted-foreground hover:underline">Online</a>
          <Separator orientation="vertical" />
          <a href="#offline" className="text-sm text-muted-foreground hover:underline">Offline</a>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full sm:w-auto">
          <TabsTrigger value="online" id="online" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Online
          </TabsTrigger>
          <TabsTrigger value="offline" id="offline" className="gap-2">
            <PackageOpen className="h-4 w-4" /> Offline
          </TabsTrigger>
        </TabsList>

        {/* ---------------------- ONLINE TAB ---------------------- */}
        <TabsContent value="online" className="mt-4 space-y-6">
          <Card className="border-amber-100">
            <CardHeader><div className="font-semibold">Select Warranty Registration</div></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <ComboBox
                  value={wrnSel}
                  onChange={(val, opt) => {
                    setWrnSel(val);
                    setWrnSelLabel(opt?.label || "");
                    if (val) loadWarrantyDetail(val);
                  }}
                  options={wrnOptions}
                  loading={wrnLoading}
                  onSearch={searchWarranty}
                  placeholder="Search by customer name / phone / serial…"
                  widthClass="w-full sm:w-[560px]"
                  selectedLabelOverride={wrnSelLabel}
                />
                <Button variant="outline" onClick={() => wrnSel && loadWarrantyDetail(wrnSel)} disabled={!wrnSel}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload
                </Button>
              </div>

              {wrnDetail ? (
                <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 opacity-70" />
                    <div className="font-medium">Registration Summary</div>
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
                      <div className="font-medium">
                        {wrnDetail?.createdAt ? new Date(wrnDetail.createdAt).toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Affected product + unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="space-y-1">
                      <Label>Affected product</Label>
                      <Select value={String(selectedGroupKey || "")} onValueChange={setSelectedGroupKey}>
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
                        <Select value={String(selectedUnitKey || "")} onValueChange={setSelectedUnitKey}>
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

                  {/* Issue + per-item notes */}
                  {selectedGroup && selectedUnit ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-2">
                      <div className="sm:col-span-5 space-y-1">
                        <Label>Issue</Label>
                        <Select value={String(selectedIssueId || "")} onValueChange={setSelectedIssueId}>
                          <SelectTrigger><SelectValue placeholder="Pick issue" /></SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {issuesLoading ? (
                              <div className="p-2 text-sm text-muted-foreground">Loading…</div>
                            ) : onlineIssues.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">No issues for this category</div>
                            ) : (
                              onlineIssues.map((it) => (
                                <SelectItem key={it._id} value={String(it._id)}>{it.issueName}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-7 space-y-1">
                        <Label>Item Notes (optional)</Label>
                        <Input
                          value={String(selectedItemNotes ?? "")}
                          onChange={(e) => setSelectedItemNotes(e.target.value)}
                          placeholder="Notes for this unit"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Intake + Admin Note */}
          <Card>
            <CardHeader><div className="font-semibold">Intake</div></CardHeader>
            <CardContent className="space-y-4">
              <IntakeSection intake={onlineIntake} setIntake={setOnlineIntake} compact />
              <div className="space-y-1">
                <Label>Admin Note (optional)</Label>
                <Textarea
                  value={onlineAdminNote}
                  onChange={(e) => setOnlineAdminNote(e.target.value)}
                  placeholder="Internal note for this request"
                  rows={3}
                />
              </div>
              <div className="pt-1">
                <Button
                  onClick={submitOnline}
                  disabled={
                    !wrnSel ||
                    !selectedGroup ||
                    !selectedUnit ||
                    !selectedIssueId ||
                    savingOnline
                  }
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
          <Card>
            <CardHeader><div className="font-semibold">Shop & Customer</div></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4 space-y-1">
                <Label>Shop</Label>
                <Select value={String(shopId || "")} onValueChange={setShopId}>
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
                <Label>Customer Name (optional)</Label>
                <Input
                  value={String(offlineCustomer.name ?? "")}
                  onChange={(e) =>
                    setOfflineCustomer((c) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="Name"
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <Label>Customer Phone (optional)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  autoComplete="tel"
                  value={String(offlineCustomer.phone ?? "")}
                  onChange={(e) =>
                    setOfflineCustomer((c) => ({
                      ...c,
                      phone: onlyDigits(e.target.value).slice(0, 10),
                    }))
                  }
                  onWheel={stopWheelChange}
                  placeholder="98XXXXXXXX"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
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
            <CardContent className="p-0">
              <div className="rounded-md border mx-4 mb-4 overflow-x-auto">
                <UiTable className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[300px]">Product</TableHead>
                      <TableHead className="min-w-[220px]">Variant</TableHead>
                      <TableHead className="min-w-[280px]">Serials</TableHead>
                      <TableHead className="min-w-[220px]">Issue</TableHead>
                      <TableHead className="min-w-[260px]">Notes</TableHead>
                      <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          No rows.
                        </TableCell>
                      </TableRow>
                    ) : (
                      offRows.map((r, idx) => {
                        const vmap = variantMap[r.productId] || { loading: false, options: [] };
                        const rowIssues = issuesForRow(r);
                        return (
                          <TableRow key={r._key}>
                            <TableCell className="min-w-[300px]">
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
                                selectedLabelOverride={r.productName || ""}
                              />
                              {r.categoryName ? (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Issues filtered by: <span className="font-medium">{r.categoryName}</span>
                                </div>
                              ) : null}
                            </TableCell>

                            <TableCell className="min-w-[220px]">
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
                                <SelectTrigger className="w-full sm:w-[240px]">
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

                            <TableCell className="min-w-[280px]">
                              <ChipsInput
                                value={r.serials}
                                onChange={(serials) => setOffField(idx, { serials })}
                                placeholder="Enter serial, press Enter"
                              />
                            </TableCell>

                            <TableCell className="min-w-[220px]">
                              <Select
                                value={String(r.issueId || "")}
                                onValueChange={(v) => {
                                  const it = issues.find((x) => String(x._id) === String(v));
                                  setOffField(idx, {
                                    issueId: v,
                                    issueName: it?.issueName || "",
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full sm:w-[240px]">
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

                            <TableCell className="min-w-[260px]">
                              <Input
                                value={String(r.notes ?? "")}
                                onChange={(e) => setOffField(idx, { notes: e.target.value })}
                                placeholder="Row note (optional)"
                              />
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => delOffRow(idx)}
                                disabled={offRows.length === 1}
                                title="Remove row"
                              >
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

          {/* Intake + Admin Note */}
          <Card>
            <CardHeader><div className="font-semibold">Intake & Notes</div></CardHeader>
            <CardContent className="space-y-4">
              <IntakeSection intake={offIntake} setIntake={setOffIntake} compact />
              <div className="space-y-1">
                <Label>Admin Note (optional)</Label>
                <Textarea
                  value={offAdminNote}
                  onChange={(e) => setOffAdminNote(e.target.value)}
                  placeholder="Internal note for this request"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
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
