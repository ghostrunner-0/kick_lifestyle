"use client";
import WebsiteLayout from "./layout";

export default function WebsiteNotFound() {
  return (
    <WebsiteLayout>
      <main className="min-h-[70vh] flex items-center justify-center text-center px-4 py-20">
        <div>
          <p className="text-sm uppercase text-muted-foreground">
            404 — Not Found
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
          <p className="mt-2 text-muted-foreground">
            The link you followed may be broken or the page moved.
          </p>
        </div>
      </main>
    </WebsiteLayout>
  );
}
