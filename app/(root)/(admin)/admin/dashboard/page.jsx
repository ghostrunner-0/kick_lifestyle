"use client";
import React from "react";
import CountOverview from "./CountOverview";
import useFetch from "@/hooks/useFetch";
import QuickAdd from "./QuickAdd";

const AdminDashboard = () => {
  const {
    data: count,
    isLoading,
    isError,
    error,
    refetch,
  } = useFetch("admin-count", "/api/dashboard/admin/count", {
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="pt-5">
        <div className="grid lg:grid-cols-4 sm:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg border bg-white dark:bg-card animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-5">
        <div className="rounded-lg border p-4 bg-red-50 text-red-700">
          Failed to load dashboard counts.{" "}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // API shape (from your route): { success, status, message, data: { category, product, customer } }
  const totals = {
    categories: count?.data?.category ?? 0,
    products: count?.data?.product ?? 0,
    customers: count?.data?.customer ?? 0,
    orders: count?.data?.orders ?? 0, // if you add orders later; else stays 0
  };

  return (
    <div className="pt-5">
      <CountOverview totals={totals} />
      <QuickAdd/>
    </div>
  );
};

export default AdminDashboard;
