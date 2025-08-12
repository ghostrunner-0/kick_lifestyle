"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Fuse from "fuse.js";
import searchData from "@/lib/Search";
const options = {
  keys: ["label", "description"],
  threshold: 0.3,
};
const SearchModel = ({ open, setOpen }) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState([]);

  const fuse = new Fuse(searchData, options);
  useEffect(() => {
    if (query.trim() === "") {
      setResult([]);
    }
    const response = fuse.search(query);
    setResult(response.map((r) => r.item));
  }, [query]);
  return (
    <Dialog open={open} onOpenChange={() => setOpen(!open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Search</DialogTitle>
          <DialogDescription>
            Find and navigate to any admin pages
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <ul className="mt-4 max-h-60 overflow-y-auto">
          {result.map((item, index) => (
            <li key={index}>
              <Link
                href={item.url}
                onClick={() => setOpen(false)}
                className="block py-2 pl-3 rounded hover:bg-muted"
              >
                <h4 className="font-medium title">{item.label}</h4>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {query && result.length == 0 && (
          <div className="text-sm text-center text-muted-foreground">
            No results found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SearchModel;
