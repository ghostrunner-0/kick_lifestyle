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

  const [state, setState] = useState({ loading: true, error: "", orderId: "" });

  useEffect(() => {
    const pidx = search.get("pidx");
    // optional params: status, purchase_order_id, etc.
    if (!pidx) {
      setState({ loading: false, error: "Missing payment reference.", orderId: "" });
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/website/payments/khalti/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pidx }),
        });
        const json = await res.json();

        if (json?.success && json?.order?.display_order_id) {
          // ✅ clear cart and go to thank-you
          dispatch(clearCart());
          router.replace(ORDERS_THANK_YOU_ROUTE(json.order.display_order_id));
          return;
        }

        // Not completed (Pending / User canceled / Expired ...)
        const status = json?.status || "Failed";
        setState({
          loading: false,
          error:
            status === "Pending"
              ? "Payment is pending. Please wait a moment and refresh."
              : status === "User canceled"
              ? "You canceled the payment."
              : status === "Expired"
              ? "Payment link expired. Please try again."
              : "Payment failed or not completed.",
          orderId: "",
        });
      } catch (e) {
        setState({ loading: false, error: e?.message || "Verification failed.", orderId: "" });
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
      <div className="flex justify-center gap-3">
        <Button onClick={() => location.reload()}>Refresh</Button>
        <Button variant="outline" onClick={() => router.push("/")}>Go to home</Button>
      </div>
    </div>
  );
}
