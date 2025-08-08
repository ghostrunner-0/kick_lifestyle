export const DT_CATEGORY_COLUMN = [
  {
    accessorKey: "name",
    header: "Category Name",
  },
  {
    accessorKey: "slug",
    header: "Slug",
  },
];
export const DT_PRODUCT_COLUMN = [
  {
    id: "product",
    header: "Product",
    accessorFn: (row) => row.name,
    Cell: ({ row }) => {
      const img = row.original?.heroImage;
      const name = row.original?.name || "-";
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {img?.path ? (
            <img
              src={img.path}
              alt={img.alt || name}
              style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
            />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 4, background: "#eee" }} />
          )}
          <span style={{ fontWeight: 500 }}>{name}</span>
        </div>
      );
    },
    enableSorting: true,
    size: 240,
  },
  {
    id: "price",
    header: "Price",
    accessorFn: (row) => row.specialPrice ?? row.mrp, // sort by the shown price
    Cell: ({ row }) => {
      const mrp = row.original?.mrp;
      const sp = row.original?.specialPrice;
      if (sp != null && sp !== "" && !Number.isNaN(sp)) {
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {mrp != null && (
              <span style={{ color: "#9CA3AF", textDecoration: "line-through" }}>₨ {mrp}</span>
            )}
            <span>₨ {sp}</span>
          </div>
        );
      }
      return mrp != null ? <span>₨ {mrp}</span> : "-";
    },
    size: 140,
  },
  {
    id: "warranty",
    header: "Warranty",
    accessorFn: (row) => row.warrantyMonths, // enable sorting by warranty
    Cell: ({ row }) => {
      const wm = row.original?.warrantyMonths;
      return Number.isFinite(wm) ? <span>{wm} months</span> : <span>-</span>;
    },
    size: 120,
  },
  {
    accessorKey: "categoryName",
    header: "Category",
    size: 160,
  },
  {
    id: "visible",
    header: "Visible",
    accessorFn: (row) => Boolean(row.showInWebsite),
    Cell: ({ row }) => {
      const visible = Boolean(row.original?.showInWebsite);
      return <span>{visible ? "✅" : "❌"}</span>;
    },
    size: 80,
  },
];


