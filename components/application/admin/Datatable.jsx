import { Recycling } from "@mui/icons-material";
import { IconButton, Popover, Tooltip } from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import { DeleteForever } from "@mui/icons-material";
import {
  MaterialReactTable,
  MRT_ShowHideColumnsButton,
  MRT_ToggleFullScreenButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import Link from "next/link";
import React, { useState, useCallback } from "react";
import useDeleteMutation from "@/hooks/useDeleteMutation";
import ButtonLoading from "../ButtonLoading";
import { SaveAllIcon } from "lucide-react";
import { showToast } from "@/lib/ShowToast";
import { download, generateCsv, mkConfig } from "export-to-csv";
import axios from "axios";

const Datatable = ({
  queryKey,
  fetchUrl,
  columnsConfig,
  initialPageSize = 25,
  exportEndpoint,
  deleteEndpoint,
  deleteType,
  trashView,
  createAction,
  customActions, // custom actions to add for selected rows (might be undefined)
}) => {
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilters, setGlobalFilters] = useState("");
  const [rowSelection, setRowSelection] = useState({}); // Default to an empty object
  const [exportLoading, setExportLoading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const deleteMutation = useDeleteMutation(queryKey, deleteEndpoint);

  const handleDelete = useCallback((ids, deleteType) => {
    let confirmMessage;
    if (deleteType === "PD") {
      confirmMessage = "Do you want to delete it?";
    } else {
      confirmMessage = "Are you sure you want to move data into trash?";
    }

    if (confirm(confirmMessage)) {
      deleteMutation.mutate({ ids, deleteType });
      setRowSelection({}); // Reset selection after deletion
    }
  }, [deleteMutation]);

const handleExport = async (selectedRows) => {
  setExportLoading(true);
  try {
    let rowData = [];

    // Prepare the data to export
    if (Object.keys(rowSelection).length > 0) {
      rowData = selectedRows.map((row) => row.original);
    } else {
      // Fetch data when no selection is made
      const { data: response } = await axios.get(exportEndpoint);
      if (!response.success) {
        throw new Error(response.message);
      }
      rowData = Array.isArray(response.data) ? response.data : []; // Ensure it's an array
    }

    // Manually create CSV content
    const headers = Object.keys(rowData[0] || {}); // Use the keys of the first row as headers
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(",")); // Join headers with commas

    // Add rows
    rowData.forEach((row) => {
      const values = headers.map((header) => row[header] || ""); // Map row values to the headers
      csvRows.push(values.join(",")); // Join values with commas
    });

    // Join rows with newlines
    const csvContent = csvRows.join("\n");

    // Create a Blob from CSV data
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Create download link and trigger the download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "data.csv"; // File name for download
    link.click(); // Trigger download
  } catch (error) {
    console.log(error);
    showToast("error", error.message);
  } finally {
    setExportLoading(false);
  }
};



  // Fetch data with useQuery
  const {
    data: { data = [], meta } = { data: [] }, // Ensure data is always an array
    isError,
    isRefetching,
    isLoading,
  } = useQuery({
    queryKey: [queryKey, { columnFilters, globalFilters, pagination, sorting }],
    queryFn: async () => {
      const url = new URL(fetchUrl, window.location.origin);
      url.searchParams.set("start", `${pagination.pageIndex * pagination.pageSize}`);
      url.searchParams.set("size", `${pagination.pageSize}`);
      url.searchParams.set("filters", JSON.stringify(columnFilters ?? []));
      url.searchParams.set("globalFilter", globalFilters ?? "");
      url.searchParams.set("sorting", JSON.stringify(sorting ?? []));
      url.searchParams.set("deleType", deleteType);

      const { data: response } = await axios.get(url.href);
      return response;
    },
    placeholderData: keepPreviousData, // Use previous data while fetching new data
  });

  const table = {
    columns: columnsConfig,
    data,
    enableBatchRowSelection: true,
    columnFilterDisplayMode: Popover,
    paginationDisplayMode: "pages",
    enableColumnOrdering: true,
    enableStickyHeader: true,
    enableStickyFooter: true,
    initialState: { 
      showColumnFilters: true,
      pagination: {
        pageSize: initialPageSize,
        pageIndex: 0,
      },
    },
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    enablePagination: true,
    enableRowSelection: true,
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilters,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    rowCount: meta?.totalRowCount ?? 0,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      globalFilters,
      isLoading,
      pagination,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
      sorting,
      rowSelection,
    },
    getRowId: (originalRow) => originalRow._id,
    renderToolbarInternalActions: ({ table }) => (
      <>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleFullScreenButton table={table} />
        {deleteType !== "PD" && (
          <Tooltip title="Recycle Bin">
            <Link href={trashView}>
              <IconButton>
                <Recycling />
              </IconButton>
            </Link>
          </Tooltip>
        )}
        {deleteType === "SD" && (
          <Tooltip title="Delete All">
            <IconButton
              disabled={Object.keys(rowSelection).length === 0}  // Check if at least one row is selected
              onClick={() => handleDelete(Object.keys(rowSelection), deleteType)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
        {deleteType === "PD" && (
          <>
            <Tooltip title="Restore Data">
              <IconButton
                disabled={Object.keys(rowSelection).length === 0}  // Check if at least one row is selected
                onClick={() => handleDelete(Object.keys(rowSelection), "RSD")}
              >
                <RestoreFromTrashIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Permanently Delete">
              <IconButton
                disabled={Object.keys(rowSelection).length === 0}  // Check if at least one row is selected
                onClick={() => handleDelete(Object.keys(rowSelection), deleteType)}
              >
                <DeleteForever />
              </IconButton>
            </Tooltip>
          </>
        )}
      </>
    ),
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActionMenuItems: ({ row }) => createAction(row, deleteType, handleDelete),
    renderTopToolbarCustomActions: ({ table }) => (
      <div>
        {customActions && Object.keys(rowSelection).length > 0 && (
          <div>{customActions(rowSelection, handleDelete)}</div>
        )}
        <Tooltip>
          <ButtonLoading
            type="button"
            className={"cursor-pointer"}
            text={<><SaveAllIcon /> Export</>}
            loading={exportLoading}
            onClick={() => handleExport(table.getSelectedRowModel().rows)}
          />
        </Tooltip>
      </div>
    ),
  };

  return <MaterialReactTable {...table} />;
};

export default Datatable;
