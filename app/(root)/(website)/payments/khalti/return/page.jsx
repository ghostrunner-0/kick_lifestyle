"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { clearCart } from "@/store/cartSlice";
import { useRouter, useSearchParams } from "next/navigation";
import { ORDERS_THANK_YOU_ROUTE } from "@/routes/WebsiteRoutes";
import { Button } from "@/components/ui/button";

export default function KhaltiReturnPage() {
  const router = useRouter();
  const search = useSearchParams();
  const dispatch = useDispatch();

  const [state, setState] = useState({
    loading: true,
    error: "",
    orderId: "",
    rawStatus: undefined,
  });

  const statusMessage = (s) => {
    switch (s) {
      case "Completed":
        return "Verifying payment…";
      case "Pending":
        return "Payment is pending. Please wait a moment and refresh.";
      case "User canceled":
        return "You canceled the payment.";
      case "Expired":
        return "Payment link expired. Please try again.";
      case "Refunded":
      case "Partially Refunded":
        return "Payment was refunded. No charge has been made.";
      case "Initiated":
        return "Payment initiated. Please wait while we confirm.";
      default:
        return "Payment failed or not completed.";
    }
  };

  useEffect(() => {
    const pidx = search.get("pidx");
    const purchase_order_id = search.get("purchase_order_id") || "";
    const statusFromQuery = search.get("status") || "";

    if (!pidx) {
      setState({
        loading: false,
        error: "Missing payment reference.",
        orderId: "",
        rawStatus: statusFromQuery || undefined,
      });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/website/payments/khalti/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pidx, purchase_order_id }),
        });
        const json = await res.json();

        if (json?.success && json?.order?.display_order_id) {
          dispatch(clearCart());
          router.replace(ORDERS_THANK_YOU_ROUTE(json.order.display_order_id));
          return;
        }

        const kStatus = json?.status || statusFromQuery || "Failed";
        setState({
          loading: false,
          error: statusMessage(kStatus),
          orderId: "",
          rawStatus: kStatus,
        });
      } catch (e) {
        setState({
          loading: false,
          error: e?.message || "Verification failed.",
          orderId: "",
          rawStatus: statusFromQuery || undefined,
        });
      }
    })();
  }, [dispatch, router, search]);

  if (state.loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">Verifying your payment…</h1>
        <p className="text-slate-600">This will just take a moment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <h1 className="text-xl font-semibold mb-2">Payment status</h1>
      <p className="text-red-600 mb-6">{state.error}</p>

      {state.rawStatus === "Pending" && (
        <p className="text-sm text-slate-600 mb-6">
          If this remains pending for more than a couple of minutes, please contact support with your order reference.
        </p>
      )}

      <div className="flex justify-center gap-3">
        <Button onClick={() => location.reload()}>Refresh</Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Go to home
        </Button>
      </div>
    </div>
  );
}
