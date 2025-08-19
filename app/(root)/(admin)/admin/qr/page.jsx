"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { showToast } from "@/lib/ShowToast";
import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD, ADMIN_QR_PAYMENT_ADD, ADMIN_QR_PAYMENT_ALL } from "@/routes/AdminRoutes";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ButtonLoading from "@/components/application/ButtonLoading";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_QR_PAYMENT_ALL, label: "QR Payments" },
];

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

const StatusPill = ({ s }) => {
  const map = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  };
  return <Badge variant={map[s] || "secondary"} className="capitalize">{s}</Badge>;
};

export default function AdminQrPaymentsPage() {
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [actingId, setActingId] = useState(null);

  const [imgOpen, setImgOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [imgAlt, setImgAlt] = useState("");

  const fetchList = useCallback(async (status, query = "") => {
    setFetching(true);
    try {
      const { data } = await axios.get("/api/admin/payments/qr", {
        withCredentials: true,
        params: { status, q: query || undefined },
      });
      if (data?.success) {
        setItems(Array.isArray(data.data) ? data.data : []);
      } else {
        showToast("error", data?.message || "Failed to load payments");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to load payments");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchList(tab, q);
  }, [tab, fetchList]); // fetch on tab switch

  const filtered = useMemo(() => {
    if (!q?.trim()) return items;
    const s = q.trim().toLowerCase();
    return items.filter((it) => {
      const a = [
        it?.display_order_id,
        it?.order_id,
        String(it?.amount),
      ].join(" ").toLowerCase();
      return a.includes(s);
    });
  }, [items, q]);

  const openImage = (src, alt = "Payment Screenshot") => {
    setImgSrc(src || "");
    setImgAlt(alt);
    setImgOpen(true);
  };

  const approve = async (id) => {
    try {
      setActingId(id);
      const { data } = await axios.post(`/api/admin/payments/qr/${id}/approve`, {}, { withCredentials: true });
      if (data?.success) {
        showToast("success", "Payment approved. Order moved to processing.");
        setItems((prev) => prev.filter((x) => x._id !== id));
      } else {
        showToast("error", data?.message || "Approve failed");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Approve failed");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    try {
      setActingId(id);
      const { data } = await axios.post(`/api/admin/payments/qr/${id}/reject`, {}, { withCredentials: true });
      if (data?.success) {
        showToast("info", "Payment rejected.");
        setItems((prev) => prev.filter((x) => x._id !== id));
      } else {
        showToast("error", data?.message || "Reject failed");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Reject failed");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
          <div className="flex items-center justify-between mt-3">
            <h4 className="text-xl font-semibold">QR Payments</h4>
            <Button asChild variant="secondary">
              <a href={ADMIN_QR_PAYMENT_ADD}>Configure QR</a>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pb-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search by order id, display id, amount…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => fetchList(tab, q)} variant="outline" disabled={fetching}>
                Refresh
              </Button>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>

              <Separator className="my-3" />

              <TabsContent value="pending">
                <PaymentsTable
                  items={filtered}
                  fetching={fetching}
                  onOpenImage={openImage}
                  onApprove={approve}
                  onReject={reject}
                  actingId={actingId}
                  showActions
                />
              </TabsContent>

              <TabsContent value="approved">
                <PaymentsTable
                  items={filtered}
                  fetching={fetching}
                  onOpenImage={openImage}
                />
              </TabsContent>

              <TabsContent value="rejected">
                <PaymentsTable
                  items={filtered}
                  fetching={fetching}
                  onOpenImage={openImage}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* image viewer */}
      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{imgAlt || "Payment Screenshot"}</DialogTitle>
          </DialogHeader>
          <div className="grid place-items-center">
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={imgAlt || "Payment Screenshot"}
                width={520}
                height={520}
                className="rounded-md object-contain"
              />
            ) : (
              <div className="text-sm text-muted-foreground py-16">No image</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentsTable({
  items, fetching, onOpenImage, onApprove, onReject, actingId, showActions = false,
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead>Display ID</TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Screenshot</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="w-[220px] text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fetching ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="py-10 text-center text-sm text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="py-10 text-center text-sm text-muted-foreground">
                No records found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((it) => {
              const created = it?.createdAt ? new Date(it.createdAt) : null;
              const img = it?.image?.url || it?.image?.path || "";
              return (
                <TableRow key={it._id}>
                  <TableCell className="whitespace-nowrap">
                    {created ? created.toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{it?.display_order_id || "—"}</TableCell>
                  <TableCell className="text-xs">{it?.order_id || "—"}</TableCell>
                  <TableCell className="text-right">{formatNpr(it?.amount || 0)}</TableCell>
                  <TableCell>
                    {img ? (
                      <button
                        className="text-sm underline underline-offset-2"
                        onClick={() => onOpenImage(img, it?.display_order_id || "Payment Screenshot")}
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">No image</span>
                    )}
                  </TableCell>
                  <TableCell><StatusPill s={it?.status || "pending"} /></TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ButtonLoading
                          variant="default"
                          text="Approve"
                          loading={actingId === it._id}
                          onClick={() => onApprove(it._id)}
                        />
                        <Button
                          variant="destructive"
                          disabled={actingId === it._id}
                          onClick={() => onReject(it._id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
