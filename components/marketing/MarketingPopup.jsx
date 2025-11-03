// components/marketing/MarketingPopup.jsx
"use client";
import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MarketingPopup({ open, onOpenChange, data }) {
  if (!data) return null;
  const { variant, title, message, couponCode, image, ctaLabel, ctaHref } =
    data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {message ? <DialogDescription>{message}</DialogDescription> : null}
        </DialogHeader>

        {variant === "coupon" && (
          <div className="mt-4 space-y-3">
            <Input readOnly value={couponCode || ""} className="font-mono" />
            {image?.path ? (
              <Image
                src={image.path}
                alt={image.alt || "Promo"}
                width={560}
                height={320}
                className="rounded-md w-full h-auto"
              />
            ) : null}
          </div>
        )}

        {variant === "launch" && (
          <div className="mt-4 space-y-3">
            {image?.path ? (
              <Image
                src={image.path}
                alt={image.alt || "Product"}
                width={560}
                height={320}
                className="rounded-md w-full h-auto"
              />
            ) : null}
            <Button asChild>
              <a href={ctaHref || "#"} target="_blank" rel="noreferrer">
                {ctaLabel || "View"}
              </a>
            </Button>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
