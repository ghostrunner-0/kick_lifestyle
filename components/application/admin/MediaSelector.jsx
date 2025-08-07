"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import axios from "axios";
import { showToast } from "@/lib/ShowToast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const LIMIT = 10;

const MediaSelector = ({
  multiple = false,
  onSelect,
  triggerLabel = "Select Media",
  selectedMedia = null, // ✅ NEW PROP
}) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [filterTag, setFilterTag] = useState("all");
  const [altSearch, setAltSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const { theme } = useTheme();

  // ✅ Pre-fill selectedFiles from prop
  useEffect(() => {
    if (selectedMedia) {
      if (multiple && Array.isArray(selectedMedia)) {
        setSelectedFiles([...selectedMedia]);
      } else if (!multiple && typeof selectedMedia === "object") {
        setSelectedFiles([selectedMedia]);
      }
    }
  }, [selectedMedia, multiple]);

  useEffect(() => {
    if (open) {
      fetchTags();
      fetchMedia("all", "", true);
    }
  }, [open]);

  const fetchTags = async () => {
    try {
      const { data } = await axios.get("/api/admin/tags");
      setTagOptions(data);
    } catch {
      showToast("error", "Failed to fetch tags.");
    }
  };

  const fetchMedia = async (
    tagId = filterTag,
    searchText = altSearch,
    reset = false
  ) => {
    try {
      const params = {
        limit: LIMIT,
        skip: reset ? 0 : page * LIMIT,
      };
      if (tagId !== "all") params.tag = tagId;
      if (searchText) params.search = searchText;
      const { data } = await axios.get("/api/admin/media", { params });
      if (reset) {
        setFiles(data.files);
        setPage(1);
      } else {
        setFiles((prev) => [...prev, ...data.files]);
        setPage((prev) => prev + 1);
      }
      setHasMore((reset ? 1 : page + 1) * LIMIT < data.total);
    } catch {
      showToast("error", "Failed to fetch media.");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSelection = (file) => {
    if (multiple) {
      const exists = selectedFiles.some((f) => f._id === file._id);
      const updated = exists
        ? selectedFiles.filter((f) => f._id !== file._id)
        : [...selectedFiles, file];
      setSelectedFiles(updated);
    } else {
      setSelectedFiles([file]);
    }
  };

  const isSelected = (file) =>
    selectedFiles.some((f) => f._id === file._id);

  const handleApply = () => {
    const cloned = multiple
      ? [...selectedFiles.map((f) => ({ ...f }))]
      : selectedFiles[0]
      ? { ...selectedFiles[0] }
      : null;

    onSelect(cloned);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">{triggerLabel}</Button>
        </DialogTrigger>

        <DialogContent className="w-full max-w-[95vw] md:max-w-[1280px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Media</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 mb-4">
            <Input
              type="text"
              placeholder="Search by alt text..."
              value={altSearch}
              onChange={(e) => {
                setAltSearch(e.target.value);
                fetchMedia(filterTag, e.target.value, true);
              }}
              className="w-[200px]"
            />
            <Select
              onValueChange={(val) => {
                setFilterTag(val);
                fetchMedia(val, altSearch, true);
              }}
              value={filterTag}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {tagOptions.map((tag) => (
                  <SelectItem key={tag._id} value={tag._id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {files.map((file) => (
                <Card
                  key={file._id}
                  className={`relative cursor-pointer border-2 ${
                    isSelected(file)
                      ? "border-blue-500"
                      : "border-transparent"
                  }`}
                  onClick={() => toggleSelection(file)}
                >
                  <CardContent className="p-2 flex justify-center items-center">
                    <Image
                      src={file.path}
                      alt={file.alt || "media"}
                      width={150}
                      height={150}
                      className="rounded object-cover max-h-[150px]"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoadingMore(true);
                    fetchMedia(filterTag, altSearch);
                  }}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 pt-4 pb-2 mt-2 border-t flex justify-end gap-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={
                multiple
                  ? selectedFiles.length === 0
                  : !selectedFiles[0]
              }
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedFiles.length > 0 && (
        <div className="pt-2">
          <p className="text-sm font-medium mb-2">
            Selected Image{multiple ? "s" : ""}:
          </p>
          <div className="flex flex-wrap gap-4">
            {selectedFiles.map((file) => (
              <Image
                key={file._id}
                src={file.path}
                alt={file.alt || "preview"}
                width={120}
                height={120}
                className="rounded border object-cover max-h-[120px]"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaSelector;
