"use client";

import { ThemeProvider } from "@mui/material";
import Datatable from "./Datatable";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { darkTheme, lightTheme } from "@/lib/MaterialTheme";

const DatatableWrapper = ({
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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent rendering until mounted (client-side)
  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider theme={resolvedTheme === "dark" ? darkTheme : lightTheme}>
      <Datatable
        queryKey={queryKey}
        fetchUrl={fetchUrl}
        columnsConfig={columnsConfig}
        initialPageSize={initialPageSize}
        exportEndpoint={exportEndpoint}
        deleteEndpoint={deleteEndpoint}
        deleteType={deleteType}
        trashView={trashView}
        createAction={createAction}
        customActions={customActions} // Pass custom actions (or undefined)
      />
    </ThemeProvider>
  );
};

export default DatatableWrapper;
