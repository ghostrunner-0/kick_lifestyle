"use client";

import React, { useEffect, useState, useRef } from "react";
import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD } from "@/routes/AdminRoutes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { showToast } from "@/lib/ShowToast";
import axios from "axios";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "", label: "Media" },
];

const LIMIT = 10;

const MediaPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [fileInput, setFileInput] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [newTagName, setNewTagName] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const [filterTag, setFilterTag] = useState("all");
  const [altSearch, setAltSearch] = useState("");
  const [activeImage, setActiveImage] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // To debounce search input
  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchTags();
    fetchMedia(filterTag, altSearch, true);
    // Cleanup previews on unmount
    return () => {
      previews.forEach(URL.revokeObjectURL);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch media with pagination, filtering by tag and search text
  const fetchMedia = async (
    tagId = filterTag,
    searchText = altSearch,
    reset = false
  ) => {
    if (reset) {
      setPage(0);
      setHasMore(true);
    }
    try {
      const params = {
        limit: LIMIT,
        skip: reset ? 0 : (page + (reset ? 0 : 1)) * LIMIT,
      };
      if (tagId && tagId !== "all") params.tag = tagId;
      if (searchText) params.search = searchText;

      const { data } = await axios.get("/api/admin/media", { params });

      if (reset) {
        setFiles(data.files);
        setPage(1);
      } else {
        setFiles((prev) => [...prev, ...data.files]);
        setPage((prev) => prev + 1);
      }

      setHasMore(((reset ? 1 : page + 1) * LIMIT) < data.total);
    } catch {
      showToast("error", "Failed to fetch media.");
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data } = await axios.get("/api/admin/tags");
      setTagOptions(data);
    } catch {
      showToast("error", "Failed to fetch tags.");
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFileInput(files);

    // Clean up old previews before setting new
    previews.forEach(URL.revokeObjectURL);

    const previewURLs = files.map((file) => URL.createObjectURL(file));
    setPreviews(previewURLs);
  };

  const handleUpload = async () => {
    if (!fileInput.length)
      return showToast("error", "Please select at least one file.");
    if (!selectedTag)
      return showToast("error", "Please select or create a tag.");

    const formData = new FormData();
    fileInput.forEach((file) => formData.append("files", file));
    formData.append("tags", selectedTag);

    setUploading(true);
    try {
      const res = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        showToast("success", "Files uploaded successfully.");
        setFileInput([]);
        previews.forEach(URL.revokeObjectURL);
        setPreviews([]);
        setSelectedTag(null);
        fetchMedia(filterTag, altSearch, true);
      } else {
        showToast("error", res.data.error || "Upload failed.");
      }
    } catch {
      showToast("error", "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!imageToDelete) return;
    try {
      await axios.delete(`/api/admin/media?id=${imageToDelete._id}`);
      showToast("success", "Image deleted.");
      setDeleteDialogOpen(false);
      setImageToDelete(null);
      fetchMedia(filterTag, altSearch, true);
    } catch {
      showToast("error", "Failed to delete image.");
    }
  };

  // Debounced search input handler
  const onSearchChange = (e) => {
    const val = e.target.value;
    setAltSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(0);
      fetchMedia(filterTag, val, true);
    }, 500);
  };

  return (
    <div className="p-5">
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active image preview dialog */}
      <Dialog open={!!activeImage} onOpenChange={() => setActiveImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogTitle>{activeImage?.alt || "media"}</DialogTitle>
          {activeImage && (
            <div className="space-y-4">
              <Image
                src={activeImage.path}
                alt={activeImage.alt || "media"}
                width={800}
                height={600}
                className="w-full h-auto rounded object-contain"
              />
              <p className="text-sm text-muted-foreground">
                <strong>Alt:</strong> {activeImage.alt || "N/A"}
              </p>
              {activeImage.tags?.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <strong>Tags:</strong>{" "}
                  {activeImage.tags
                    .map((tag) => (typeof tag === "string" ? tag : tag.name))
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-6 space-y-6">
        {/* Upload section */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Upload Files</h2>
          <Input
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
          />
          <div className="flex items-center gap-4 mt-4">
            <Select onValueChange={setSelectedTag} value={selectedTag} disabled={uploading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a tag" />
              </SelectTrigger>
              <SelectContent>
                {tagOptions.map((tag) => (
                  <SelectItem key={tag._id} value={tag._id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* New tag creation dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={uploading}>
                  + New Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Tag</DialogTitle>
                  <DialogDescription>
                    Give a name for the new tag.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. Homepage Banner"
                  disabled={creatingTag}
                />
                <Button
                  className="mt-3"
                  disabled={creatingTag || !newTagName.trim()}
                  onClick={async () => {
                    try {
                      setCreatingTag(true);
                      const res = await axios.post("/api/admin/tags", {
                        name: newTagName.trim(),
                      });
                      setSelectedTag(res.data._id);
                      setNewTagName("");
                      fetchTags();
                      showToast("success", "Tag created.");
                    } catch {
                      showToast("error", "Failed to create tag.");
                    } finally {
                      setCreatingTag(false);
                    }
                  }}
                >
                  {creatingTag ? "Creating..." : "Create"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          {/* File previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
              {previews.map((src, idx) => (
                <Card key={idx}>
                  <CardContent className="p-2 flex justify-center items-center">
                    <Image
                      src={src}
                      alt={`preview-${idx}`}
                      width={150}
                      height={150}
                      className="rounded object-cover max-h-[150px]"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !fileInput.length || !selectedTag}
            className="mt-4"
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        {/* Media library filter and list */}
        <div className="mt-10">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <Input
              type="text"
              placeholder="Search by alt text..."
              value={altSearch}
              onChange={onSearchChange}
              className="w-[200px]"
              disabled={loadingMore}
            />
            <Select
              onValueChange={(val) => {
                setFilterTag(val);
                setPage(0);
                fetchMedia(val, altSearch, true);
              }}
              value={filterTag}
              disabled={loadingMore}
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
            {(filterTag !== "all" || altSearch.trim() !== "") && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterTag("all");
                  setAltSearch("");
                  setPage(0);
                  fetchMedia("all", "", true);
                }}
                disabled={loadingMore}
              >
                Clear Filter
              </Button>
            )}
          </div>

          <h2 className="text-xl font-semibold mb-4">Media Library</h2>
          {files.length === 0 ? (
            <p className="text-muted-foreground">No media uploaded yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {files.map((file) => (
                  <Card key={file._id} className="relative group">
                    <CardContent className="p-2 flex justify-center items-center">
                      <Image
                        src={file.path}
                        alt={file.alt || "media"}
                        width={150}
                        height={150}
                        className="rounded object-cover max-h-[150px] cursor-pointer"
                        onClick={() => setActiveImage(file)}
                      />
                      <Button
                        variant="ghost"
                        className="absolute top-1 right-1 opacity-70 hover:opacity-100"
                        onClick={() => {
                          setImageToDelete(file);
                          setDeleteDialogOpen(true);
                        }}
                        aria-label={`Delete ${file.alt || "media"}`}
                      >
                        🗑️
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-6">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaPage;
