"use client";
import AdminLayout from "@/app/(root)/(admin)/admin/layout";

export default function AdminNotFound() {
  return (
    <AdminLayout>
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div>
          <p className="text-sm uppercase text-muted-foreground">Admin 404</p>
          <h1 className="mt-2 text-2xl font-semibold">Admin page not found</h1>
          <p className="mt-2 text-muted-foreground">
            This admin route doesn’t exist or your session expired.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
