"use client";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import DatatableWrapper from "@/components/application/admin/DatatableWrapper";
import DeleteAction from "@/components/application/admin/DeleteAction";
import EditAction from "@/components/application/admin/EditAction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DT_CATEGORY_COLUMN } from "@/lib/Column";
import { columnConfig } from "@/lib/helperFunctions";
import {
  ADMIN_CATEGORY_ADD,
  ADMIN_CATEGORY_EDIT,
  ADMIN_DASHBOARD,
  ADMIN_TRASH_ROUTE,
} from "@/routes/AdminRoutes";
import { FilePlus } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useMemo } from "react";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "#", label: "Category" },
];

const showCategory = () => {
  // Fix: Using `useMemo` to memoize and return columns configuration
  const columns = useMemo(() => {
    return columnConfig(DT_CATEGORY_COLUMN, true, false, false);
  }, []);

  // Fix: Proper action function initialization
  const action = useCallback((row, deleteType, handleDelete) => {
    const actionMenu = []; // Initialize as an empty array
    actionMenu.push(
      <EditAction href={ADMIN_CATEGORY_EDIT(row.original._id)} />
    );
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
            <h4 className="text-xl font-semibold">All Category</h4>
            <Button>
              <FilePlus />
              <Link href={ADMIN_CATEGORY_ADD}>Add Category</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {/* Pass the correct props to DatatableWrapper */}
          <DatatableWrapper
            queryKey={"category-data"}
            fetchUrl={"/api/category"}
            initialPageSize={10}
            columnsConfig={columns} // Pass the columns here
            exportEndpoint={"/api/category/export"}
            deleteEndpoint={"/api/category/delete"}
            deleteType={"SD"}
            trashView={`${ADMIN_TRASH_ROUTE}?trashof=category`}
            createAction={action} // Pass the action function here
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default showCategory;
