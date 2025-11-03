// components/marketing/PopupRuntime.jsx
"use client";
import React from "react";
import MarketingPopup from "./MarketingPopup";

export default function PopupRuntime({
  autoOpenDelayMs = 1200,
  oncePerSession = true,
}) {
  const [data, setData] = React.useState(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const res = await fetch("/api/popup/active", { cache: "no-store" });
      const json = await res.json();
      setData(json || null);

      if (json) {
        const key = "popup_shown_session";
        if (oncePerSession && sessionStorage.getItem(key)) return;
        setTimeout(() => {
          setOpen(true);
          if (oncePerSession) sessionStorage.setItem(key, "1");
        }, autoOpenDelayMs);
      }
    })();
  }, [autoOpenDelayMs, oncePerSession]);

  if (!data) return null;
  return <MarketingPopup open={open} onOpenChange={setOpen} data={data} />;
}
