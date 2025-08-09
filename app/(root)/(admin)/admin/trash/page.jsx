"use client";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import DatatableWrapper from "@/components/application/admin/DatatableWrapper";
import DeleteAction from "@/components/application/admin/DeleteAction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DT_CATEGORY_COLUMN, DT_PRODUCT_COLUMN, DT_PRODUCT_VARIANT_COLUMN } from "@/lib/Column";
import { columnConfig } from "@/lib/helperFunctions";
import {
  ADMIN_CATEGORY_ADD,
  ADMIN_CATEGORY_EDIT,
  ADMIN_DASHBOARD,
  ADMIN_TRASH_ROUTE,
} from "@/routes/AdminRoutes";
import { FilePlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useMemo } from "react";

// Breadcrumb data
const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_TRASH_ROUTE, label: "Trash" },
];

// Configuration for the Trash page based on category
const TRASH_CONFIG = {
  category: {
    title: "Category Trash",
    columns: DT_CATEGORY_COLUMN,
    fetchUrl: "/api/category",
    exportUrl: "/api/category/export",
    deleteUrl: "/api/category/delete",
  },
  product: {
    title: "Product Trash",
    columns: DT_PRODUCT_COLUMN,
    fetchUrl: "/api/product",
    exportUrl: "/api/product/export",
    deleteUrl: "/api/product/delete",
  },
  'product-variant': {
    title: "Product Variant Trash",
    columns: DT_PRODUCT_VARIANT_COLUMN,
    fetchUrl: "/api/product-variant",
    exportUrl: "/api/product-variant/export",
    deleteUrl: "/api/product-variant/delete",
  },
};

const Trash = () => {
  // Get trashof parameter from URL
  const searchParams = useSearchParams();
  const trashof = searchParams.get("trashof");

  // Access the correct configuration based on trashof
  const config = TRASH_CONFIG[trashof];

  // Memoize columns configuration
  const columns = useMemo(() => {
    return columnConfig(config.columns, false, false, true); // Include createdAt column
  }, [config.columns]);

  // Proper action function initialization
  const action = useCallback((row, deleteType, handleDelete) => {
    const actionMenu = []; // Initialize as an empty array
    actionMenu.push(
      <DeleteAction
        handleDelete={handleDelete}
        row={row}
        deleteType={deleteType}
      />
    );
    return actionMenu;
  }, []);

  return (
    <div>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <Card className="py-0 rounded shadow-sm gap-0">
        <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
          <div className="flex justify-between items-center mt-3">
            <h4 className="text-xl font-semibold">{config.title}</h4>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {/* Pass the correct props to DatatableWrapper */}
          <DatatableWrapper
            queryKey={`${trashof}-data-deleted`}
            fetchUrl={config.fetchUrl}
            initialPageSize={10}
            columnsConfig={columns} // Pass the columns here
            exportEndpoint={config.exportUrl}
            deleteEndpoint={config.deleteUrl}
            deleteType={"PD"}
            createAction={action} // Pass the action function here
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Trash;
