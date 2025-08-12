"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";

// dnd-kit
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// icons
import { Pencil, Trash2 } from "lucide-react";

// routes
import { ADMIN_BANNERS_ADD, ADMIN_BANNERS_EDIT } from "@/routes/AdminRoutes";

// Sortable Card Row
function SortableCard({ banner, onRemove, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner._id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`border bg-white dark:bg-card ${
        isDragging ? "shadow-lg ring-1 ring-primary/30" : ""
      }`}
    >
      <CardContent className="flex items-center gap-4 p-3">
        <button
          className="shrink-0 grid h-10 w-10 place-items-center rounded bg-muted text-2xl leading-none cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        {/* Desktop image */}
        <div className="relative h-16 w-40 overflow-hidden rounded border">
          <Image
            src={banner.desktopImage?.path || "/placeholder.png"}
            alt={banner.desktopImage?.alt || "desktop"}
            fill
            className="object-cover"
            sizes="160px"
          />
        </div>

        {/* Mobile image */}
        <div className="relative h-16 w-10 overflow-hidden rounded border">
          <Image
            src={banner.mobileImage?.path || "/placeholder.png"}
            alt={banner.mobileImage?.alt || "mobile"}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Order: {banner.order}</Badge>
            <Badge
              className={
                banner.active
                  ? ""
                  : "bg-gray-200 text-gray-700 hover:bg-gray-200"
              }
            >
              {banner.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="mt-1 truncate text-sm">
            <span className="font-medium">Href:</span> {banner.href || "#"}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            disabled={disabled}
            title="Edit"
          >
            <Link href={`${ADMIN_BANNERS_EDIT(banner._id)}`}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Link>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onRemove(banner._id)}
            disabled={disabled}
            title="Remove"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BannersAll() {
  const [items, setItems] = useState([]); // {_id, desktopImage, mobileImage, href, active, order}
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/banners?active=all");
        const list = Array.isArray(data?.data) ? data.data : data || [];
        setItems(list.sort((a, b) => a.order - b.order));
      } catch (e) {
        // optional: toast error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i._id === active.id);
    const newIndex = items.findIndex((i) => i._id === over.id);

    const prev = items;
    const reordered = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      order: idx, // 0-based to match "new at top" logic; change to idx+1 if you prefer 1-based
    }));

    // optimistic UI
    setItems(reordered);

    // persist
    setSaving(true);
    try {
      await axios.put(
        "/api/banners/reorder",
        reordered.map(({ _id, order }) => ({ _id, order }))
      );
    } catch (e) {
      setItems(prev); // revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    if (!id) return;
    const ok = window.confirm("Remove this banner?");
    if (!ok) return;

    const prev = items;
    setDeletingId(id);
    // optimistic remove
    setItems((curr) => curr.filter((b) => b._id !== id));

    try {
      await axios.delete(`/api/banners/${id}`);
    } catch (e) {
      // revert on error
      setItems(prev);
      alert("Failed to remove banner.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Banners</h2>
        <Button asChild>
          <Link href={ADMIN_BANNERS_ADD} title="Add Banner">
            ＋ Banner
          </Link>
        </Button>
      </div>

      {/* Helper text */}
      <div className="text-sm text-muted-foreground">
        {saving ? "Saving order…" : "Drag cards to change order"}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-3">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-16 w-40 rounded" />
                <Skeleton className="h-16 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {items.map((banner) => (
                <SortableCard
                  key={banner._id}
                  banner={banner}
                  onRemove={handleRemove}
                  disabled={saving || deletingId === banner._id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
