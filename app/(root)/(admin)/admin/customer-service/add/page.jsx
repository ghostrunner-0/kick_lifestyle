// /app/(admin)/service/intake/page.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/lib/ShowToast";
import { Plus, Trash2 } from "lucide-react";

const INTAKE = ["indrive", "pathao", "courier", "walkin"];
const PAYER = ["company", "customer"];

export default function ServiceIntakePage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Customer Service Intake</h1>
      <Tabs defaultValue="online" className="space-y-4">
        <TabsList>
          <TabsTrigger value="online">Online (Warranty)</TabsTrigger>
          <TabsTrigger value="offline">Offline (Shops)</TabsTrigger>
        </TabsList>

        <TabsContent value="online">
          <OnlineIntake />
        </TabsContent>

        <TabsContent value="offline">
          <OfflineIntake />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- helpers ---------------- */
const fetchProducts = async (q) => {
  const { data } = await axios.get(`/api/products/search?q=${encodeURIComponent(q||"")}`, { withCredentials:true });
  return data?.items || [];
};
const fetchIssuesForCategory = async ({ categoryId, categoryName }) => {
  const params = new URLSearchParams();
  if (categoryId) params.set("categoryId", categoryId);
  if (categoryName) params.set("categoryName", categoryName);
  const { data } = await axios.get(`/api/service/issues?${params.toString()}`, { withCredentials:true });
  return data?.items || [];
};

/* ---------------- Online ---------------- */

function OnlineIntake() {
  const [serial, setSerial] = useState("");
  const [matches, setMatches] = useState([]); // WR matches
  const [chosenWrId, setChosenWrId] = useState(""); // user pick
  const [wrDefaultProduct, setWrDefaultProduct] = useState(null); // snapshot from WR item
  const [prodQuery, setProdQuery] = useState("");
  const [prodOptions, setProdOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null); // override or null -> use WR product
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [issues, setIssues] = useState([]);
  const [issuePick, setIssuePick] = useState({ issueId: null, issueName: "", categoryName: "" });
  const [intake, setIntake] = useState({ method: "", payer: null, amount: "", reference: "" });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(false);

  // resolve serial
  const doResolve = async () => {
    if (!serial.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/service/resolve-serial?serial=${encodeURIComponent(serial.trim())}`, { withCredentials: true });
      const list = Array.isArray(data?.matches) ? data.matches : [];
      setMatches(list);
      if (list.length === 1) {
        const wr = list[0];
        setChosenWrId(String(wr._id || wr.wrId || wr.wrId));
        const snap = wr.items ? wr.items : wr.item; // aggregate shape vs project
        const p = snap?.product || {};
        setWrDefaultProduct({
          productId: p.productId || null,
          variantId: p.variantId || null,
          productName: p.productName || "",
          variantName: p.variantName || "",
          categoryName: null, // not kept in WR, we’ll get from search if override
        });
      } else if (list.length > 1) {
        setChosenWrId("");
        setWrDefaultProduct(null);
        setChooseOpen(true);
      } else {
        showToast("error", "No warranty record found for this serial.");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.error || e?.message || "Resolve failed");
    } finally {
      setLoading(false);
    }
  };

  // choose WR (when multiple)
  const pickWr = (m) => {
    setChosenWrId(String(m.wrId || m._id));
    const p = m.item?.product || {};
    setWrDefaultProduct({
      productId: p.productId || null,
      variantId: p.variantId || null,
      productName: p.productName || "",
      variantName: p.variantName || "",
    });
    setChooseOpen(false);
  };

  // product search for override
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!prodQuery) { setProdOptions([]); return; }
      const items = await fetchProducts(prodQuery);
      if (!alive) return;
      setProdOptions(items);
    })();
    return () => { alive = false; };
  }, [prodQuery]);

  // when product changes → load issues by category
  useEffect(() => {
    (async () => {
      const source = selectedProduct
        ? { categoryId: selectedProduct.categoryId, categoryName: selectedProduct.categoryName }
        : null;
      if (!source) {
        setIssues([]);
        setIssuePick({ issueId:null, issueName:"", categoryName:"" });
        return;
      }
      const rows = await fetchIssuesForCategory(source);
      setIssues(rows);
      // default pick first
      if (rows.length) setIssuePick({ issueId: rows[0]._id, issueName: rows[0].issueName, categoryName: rows[0].categoryName });
    })();
  }, [selectedProduct]);

  // submit
  const createOnline = async () => {
    if (!serial.trim()) return showToast("error", "Serial required");
    if (!chosenWrId) return showToast("error", "Choose a warranty entry");
    if (!intake.method) return showToast("error", "Choose intake method");
    if (!(issuePick.issueName && issuePick.categoryName)) return showToast("error", "Pick an issue");

    const body = {
      serial: serial.trim().toUpperCase(),
      pick: { wrId: chosenWrId },
      intake: {
        method: intake.method,
        payer: intake.method === "walkin" ? null : (intake.payer || null),
        amount: intake.method === "walkin" ? 0 : Number(intake.amount || 0),
        reference: intake.reference || "",
      },
      issue: { ...issuePick },
      notes,
    };

    // product override if selected
    if (selectedProduct) {
      const variantName = selectedProduct.variants?.find(v => String(v._id) === String(selectedVariantId))?.variantName || "";
      body.productOverride = {
        productId: selectedProduct._id,
        variantId: selectedVariantId || null,
        productName: selectedProduct.name,
        variantName,
      };
    }

    try {
      const { data } = await axios.post("/api/service/online", body, { withCredentials: true });
      if (data?.needPick) return showToast("error", "Multiple records – pick one");
      if (data?.success) {
        showToast("success", "Online request created");
        // reset minimal
        setSerial("");
        setMatches([]);
        setChosenWrId("");
        setWrDefaultProduct(null);
        setSelectedProduct(null);
        setSelectedVariantId("");
        setIssues([]);
        setIssuePick({ issueId:null, issueName:"", categoryName:"" });
        setIntake({ method:"", payer:null, amount:"", reference:"" });
        setNotes("");
      } else {
        showToast("error", data?.error || "Create failed");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.error || e?.message || "Create failed");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-2">
        <CardHeader><CardTitle>Online (Warranty)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* serial resolve */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1">
              <Label>Serial</Label>
              <Input value={serial} onChange={(e)=> setSerial(e.target.value)} onKeyDown={(e)=> e.key==="Enter" && doResolve()} placeholder="Scan / enter serial and press Enter" />
            </div>
            <div className="pt-6 sm:pt-0 flex items-end">
              <Button onClick={doResolve} disabled={!serial.trim() || loading} className="w-full sm:w-auto">Resolve</Button>
            </div>
          </div>

          {/* WR choose */}
          {matches.length > 0 && (
            <div className="space-y-2">
              <Label>Warranty entries</Label>
              <div className="grid gap-2">
                {matches.map(m => (
                  <button
                    key={String(m.wrId || m._id)}
                    className={`text-left rounded border p-3 hover:bg-muted ${String(chosenWrId)===String(m.wrId||m._id) ? "ring-2 ring-primary" : ""}`}
                    onClick={()=> pickWr(m)}
                  >
                    <div className="font-medium">{m.item?.product?.productName}</div>
                    <div className="text-muted-foreground text-sm">{m.item?.product?.variantName || "—"}</div>
                    <div className="text-xs mt-1">Customer: {m.customer?.name} • {m.customer?.phone}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product override */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Product (override optional)</Label>
              <Input value={prodQuery} onChange={(e)=> setProdQuery(e.target.value)} placeholder="Search product / model…" />
              {prodOptions.length>0 && (
                <div className="mt-2 max-h-52 overflow-auto rounded border">
                  {prodOptions.map(p => (
                    <button
                      key={p._id}
                      className={`w-full text-left p-2 hover:bg-muted ${selectedProduct?._id===p._id ? "bg-muted" : ""}`}
                      onClick={()=>{
                        setSelectedProduct(p);
                        setSelectedVariantId("");
                      }}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.modelNumber} • {p.categoryName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Variant</Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId} disabled={!selectedProduct || !(selectedProduct.variants||[]).length}>
                <SelectTrigger><SelectValue placeholder={selectedProduct ? (selectedProduct.variants?.length ? "Choose variant" : "No variants") : "Choose product first"} /></SelectTrigger>
                <SelectContent>
                  {(selectedProduct?.variants||[]).map(v => (
                    <SelectItem key={v._id} value={v._id}>{v.variantName || v.sku || "Variant"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedProduct && wrDefaultProduct && (
                <div className="text-xs text-muted-foreground mt-1">Default from warranty: {wrDefaultProduct.productName} {wrDefaultProduct.variantName? `• ${wrDefaultProduct.variantName}`:""}</div>
              )}
            </div>
          </div>

          {/* Issues by category (from selected product). If no override selected, you can still type freeform */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Issue</Label>
              <Select
                value={issuePick.issueId || ""}
                onValueChange={(v)=>{
                  const row = issues.find(x=> x._id===v);
                  setIssuePick(row ? { issueId: row._id, issueName: row.issueName, categoryName: row.categoryName } : { issueId:null, issueName:"", categoryName:"" });
                }}
                disabled={!selectedProduct || issues.length===0}
              >
                <SelectTrigger><SelectValue placeholder={selectedProduct ? (issues.length? "Select issue" : "No issues in this category") : "Choose a product first"} /></SelectTrigger>
                <SelectContent>
                  {issues.map(r => (<SelectItem key={r._id} value={r._id}>{r.issueName}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e)=> setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Intake */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Intake method</Label>
              <Select value={intake.method} onValueChange={(v)=> setIntake(s=>({...s, method:v, payer:null, amount:""}))}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{INTAKE.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {intake.method !== "walkin" && (
              <>
                <div className="space-y-1">
                  <Label>Who paid?</Label>
                  <Select value={intake.payer || ""} onValueChange={(v)=> setIntake(s=>({...s, payer:v}))}>
                    <SelectTrigger><SelectValue placeholder="company / customer" /></SelectTrigger>
                    <SelectContent>{PAYER.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Amount (NPR)</Label>
                  <Input type="number" value={intake.amount} onChange={(e)=> setIntake(s=>({...s, amount:e.target.value}))}/>
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <Label>Reference</Label>
                  <Input value={intake.reference} onChange={(e)=> setIntake(s=>({...s, reference:e.target.value}))} placeholder="Rider / tracking / etc."/>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={createOnline} disabled={!serial.trim() || !chosenWrId || !intake.method}>Create Online Request</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={chooseOpen} onOpenChange={setChooseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Choose a warranty entry</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {matches.map(m => (
              <button key={String(m.wrId||m._id)} className="w-full text-left rounded border p-3 hover:bg-muted" onClick={()=> pickWr(m)}>
                <div className="font-medium">{m.item?.product?.productName}</div>
                <div className="text-muted-foreground">{m.item?.product?.variantName || "—"}</div>
                <div className="text-xs mt-1">Customer: {m.customer?.name} • {m.customer?.phone}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Offline ---------------- */

function OfflineIntake() {
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [intake, setIntake] = useState({ method: "", payer: null, amount: "", reference: "" });

  // one row = one serial
  const blankRow = { product: null, prodQuery: "", variants: [], variantId: "", serial: "", issues: [], issueId: "", issueName: "", categoryName: "", notes: "" };
  const [rows, setRows] = useState([ { ...blankRow } ]);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/offline-shops/list", { withCredentials: true }).catch(()=>({data:{items:[]}}));
        setShops(data?.items || []);
      } catch { setShops([]); }
    })();
  }, []);

  const setRow = (i, patch) => setRows(prev => prev.map((r,idx)=> idx===i ? ({...r, ...patch}) : r));
  const addRow = () => setRows(prev => ([...prev, { ...blankRow }]));
  const delRow = (i) => setRows(prev => prev.filter((_,idx)=> idx!==i));

  // product search per-row
  const searchRowProducts = async (i, q) => {
    setRow(i, { prodQuery: q });
    if (!q.trim()) { setRow(i, { product:null, variants:[], variantId:"", issues:[], issueId:"", issueName:"", categoryName:"" }); return; }
    const items = await fetchProducts(q);
    setRow(i, { productSearch: items });
  };

  // choose product in a row → load variants + issues
  const chooseRowProduct = async (i, p) => {
    setRow(i, {
      product: p,
      variants: p.variants || [],
      variantId: "",
      prodQuery: `${p.name} ${p.modelNumber || ""}`.trim(),
    });
    const iss = await fetchIssuesForCategory({ categoryId: p.categoryId, categoryName: p.categoryName });
    setRow(i, {
      issues: iss,
      issueId: iss[0]?._id || "",
      issueName: iss[0]?.issueName || "",
      categoryName: iss[0]?.categoryName || "",
    });
  };

  const submitOffline = async () => {
    if (!shopId) return showToast("error", "Choose a shop");
    if (!intake.method) return showToast("error", "Choose intake method");

    const items = [];
    for (const r of rows) {
      if (!r.product || !r.serial || !r.issueName || !r.categoryName) {
        return showToast("error", "Each row needs product, serial & issue");
      }
      items.push({
        productId: r.product?._id || null,
        variantId: r.variantId || null,
        productName: r.product?.name || "",
        variantName: r.variants?.find(v=> String(v._id)===String(r.variantId))?.variantName || "",
        serial: r.serial.toUpperCase().trim(),
        issueId: r.issueId || null,
        issueName: r.issueName,
        categoryName: r.categoryName,
        notes: r.notes || "",
      });
    }

    const body = {
      shopId,
      customer,
      intake: {
        method: intake.method,
        payer: intake.method === "walkin" ? null : (intake.payer || null),
        amount: intake.method === "walkin" ? 0 : Number(intake.amount || 0),
        reference: intake.reference || "",
      },
      items,
      adminNote,
    };

    try {
      const { data } = await axios.post("/api/service/offline", body, { withCredentials: true });
      if (data?.success) {
        showToast("success", "Offline request created");
        // reset
        setShopId("");
        setCustomer({ name:"", phone:"" });
        setIntake({ method:"", payer:null, amount:"", reference:"" });
        setRows([{ ...blankRow }]);
        setAdminNote("");
      } else {
        showToast("error", data?.error || "Create failed");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.error || e?.message || "Create failed");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-1 gap-4">
      <Card>
        <CardHeader><CardTitle>Offline (Shops) — One serial per row</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Shop</Label>
              <Select value={shopId} onValueChange={setShopId}>
                <SelectTrigger><SelectValue placeholder="Select shop" /></SelectTrigger>
                <SelectContent>{shops.map(s => <SelectItem key={s._id} value={s._id}>{s.name}{s.location?` • ${s.location}`:""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Customer (optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name" value={customer.name} onChange={(e)=> setCustomer(c=>({...c, name:e.target.value}))}/>
                <Input placeholder="Phone" value={customer.phone} onChange={(e)=> setCustomer(c=>({...c, phone:e.target.value}))}/>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Intake method</Label>
              <Select value={intake.method} onValueChange={(v)=> setIntake(s=>({...s, method:v, payer:null, amount:""}))}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{INTAKE.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {intake.method !== "walkin" && (
              <>
                <div className="space-y-1">
                  <Label>Who paid?</Label>
                  <Select value={intake.payer || ""} onValueChange={(v)=> setIntake(s=>({...s, payer:v}))}>
                    <SelectTrigger><SelectValue placeholder="company / customer" /></SelectTrigger>
                    <SelectContent>{PAYER.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Amount (NPR)</Label>
                  <Input type="number" value={intake.amount} onChange={(e)=> setIntake(s=>({...s, amount:e.target.value}))}/>
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label>Reference</Label>
                  <Input value={intake.reference} onChange={(e)=> setIntake(s=>({...s, reference:e.target.value}))} placeholder="Airway / Rider" />
                </div>
              </>
            )}
          </div>

          {/* rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Rows</h3>
              <Button size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Add row</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r,i)=> (
                  <TableRow key={i}>
                    <TableCell className="min-w-[260px]">
                      <Input placeholder="Search product…" value={r.prodQuery} onChange={(e)=> searchRowProducts(i, e.target.value)} />
                      {(r.productSearch||[]).length>0 && (
                        <div className="mt-2 max-h-40 overflow-auto rounded border">
                          {r.productSearch.map(p => (
                            <button
                              key={p._id}
                              className={`w-full text-left p-2 hover:bg-muted ${r.product?._id===p._id ? "bg-muted":""}`}
                              onClick={()=> chooseRowProduct(i, p)}
                            >
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.modelNumber} • {p.categoryName}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Select value={r.variantId} onValueChange={(v)=> setRow(i, { variantId: v })} disabled={!(r.variants||[]).length}>
                        <SelectTrigger><SelectValue placeholder={r.product ? (r.variants?.length? "Choose variant":"No variants") : "Pick product"} /></SelectTrigger>
                        <SelectContent>
                          {(r.variants||[]).map(v => <SelectItem key={v._id} value={v._id}>{v.variantName || v.sku || "Variant"}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <Input placeholder="Serial" value={r.serial} onChange={(e)=> setRow(i, { serial: e.target.value })} />
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      <Select
                        value={r.issueId}
                        onValueChange={(v)=>{
                          const row = (r.issues||[]).find(x=> x._id===v);
                          setRow(i, row ? { issueId: row._id, issueName: row.issueName, categoryName: row.categoryName } : { issueId:"", issueName:"", categoryName:"" });
                        }}
                        disabled={!r.product || !(r.issues||[]).length}
                      >
                        <SelectTrigger><SelectValue placeholder={r.product ? (r.issues?.length? "Select issue":"No issues") : "Pick product"} /></SelectTrigger>
                        <SelectContent>
                          {(r.issues||[]).map(x => <SelectItem key={x._id} value={x._id}>{x.issueName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <Input placeholder="Notes (optional)" value={r.notes} onChange={(e)=> setRow(i, { notes: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={()=> delRow(i)}><Trash2 className="h-4 w-4"/></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-1">
              <Label>Admin note</Label>
              <Textarea rows={3} value={adminNote} onChange={(e)=> setAdminNote(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <Button onClick={submitOffline}>Create Offline Request</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
