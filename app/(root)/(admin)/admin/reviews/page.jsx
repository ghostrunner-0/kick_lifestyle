"use client";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import DatatableWrapper from "@/components/application/admin/DatatableWrapper";
import DeleteAction from "@/components/application/admin/DeleteAction";
import ViewReview from "@/components/application/admin/ViewReview";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DT_REVIEW_COLUMN } from "@/lib/Column";
import { columnConfig } from "@/lib/helperFunctions";
import { ADMIN_DASHBOARD, ADMIN_Product_ALL, ADMIN_TRASH_ROUTE } from "@/routes/AdminRoutes";
import React, { useCallback, useMemo } from "react";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_Product_ALL, label: "Product" },
];

const AllProducts = () => {
  const columns = useMemo(() => columnConfig(DT_REVIEW_COLUMN, true, false, false), []);

  const action = useCallback((row, deleteType, handleDelete) => {
    const actionMenu = [];
    actionMenu.push(
      <ViewReview id={row._id || row.id} key="view-review" />
    );
    actionMenu.push(
      <DeleteAction
        handleDelete={handleDelete}
        row={row}
        deleteType={deleteType}
        key="delete-action"
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
            <h4 className="text-xl font-semibold">All Reviews</h4>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <DatatableWrapper
            queryKey={"review-data"}
            fetchUrl={"/api/reviews"}
            initialPageSize={10}
            columnsConfig={columns}
            exportEndpoint={"/api/reviews/export"}
            deleteEndpoint={"/api/reviews/delete"}
            deleteType={"SD"}
            trashView={`${ADMIN_TRASH_ROUTE}?trashof=reviews`}
            createAction={action}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AllProducts;
