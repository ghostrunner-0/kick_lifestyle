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

export const DT_PRODUCT_VARIANT_COLUMN = [
  // Variant (swatch + name)
  {
    id: "variant",
    header: "Variant",
    accessorFn: (row) => row.variantName,
    Cell: ({ row }) => {
      const img = row.original?.swatchImage;
      const name = row.original?.variantName || "-";
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

  // Parent Product (accepts either `productName` from pipeline OR populated `product.name`)
  {
    id: "productName",
    header: "Product",
    accessorFn: (row) => row.productName ?? row?.product?.name ?? "",
    Cell: ({ row }) => {
      const name = row.original?.productName ?? row.original?.product?.name ?? "-";
      return <span>{name}</span>;
    },
    size: 220,
  },

  // Price (strike-through MRP when specialPrice exists)
  {
    id: "price",
    header: "Price",
    accessorFn: (row) => row.specialPrice ?? row.mrp, // sort by shown price
    Cell: ({ row }) => {
      const mrp = row.original?.mrp;
      const sp = row.original?.specialPrice;
      if (sp != null && sp !== "" && !Number.isNaN(sp)) {
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Number.isFinite(mrp) && (
              <span style={{ color: "#9CA3AF", textDecoration: "line-through" }}>₨ {mrp}</span>
            )}
            <span>₨ {sp}</span>
          </div>
        );
      }
      return Number.isFinite(mrp) ? <span>₨ {mrp}</span> : "-";
    },
    size: 140,
  },

  // SKU
  {
    accessorKey: "sku",
    header: "SKU",
    size: 160,
  },

  // Gallery image count
  {
    id: "galleryCount",
    header: "Gallery",
    accessorFn: (row) => (Array.isArray(row.productGallery) ? row.productGallery.length : 0),
    Cell: ({ row }) => {
      const count = Array.isArray(row.original?.productGallery)
        ? row.original.productGallery.length
        : 0;
      return <span>{count}</span>;
    },
    size: 100,
  },
];



export const DT_COUPON_COLUMN = [
  {
    accessorKey: "code",
    header: "Code",
    size: 140,
    Cell: ({ row }) => <span style={{ fontWeight: 600 }}>{row.original.code}</span>,
  },
  {
    id: "discount",
    header: "Discount",
    accessorFn: (row) => `${row.discountAmount} ${row.discountType === "percentage" ? "%" : "₨"}`,
    Cell: ({ row }) => {
      const { discountType, discountAmount } = row.original;
      return (
        <span>
          {discountType === "percentage" ? `${discountAmount}%` : `₨ ${discountAmount}`}
        </span>
      );
    },
    size: 120,
  },
  {
    accessorKey: "individualUse",
    header: "Single Use?",
    Cell: ({ row }) => (row.original.individualUse ? "✅" : "❌"),
    size: 100,
  },
  {
    id: "scope",
    header: "Scope",
    accessorFn: (row) => {
      if (row.specificProducts?.length) return `${row.specificProducts.length} Product(s)`;
      if (row.specificVariants?.length) return `${row.specificVariants.length} Variant(s)`;
      return "All Products";
    },
    size: 180,
  },
  {
    id: "limits",
    header: "Usage Limits",
    accessorFn: (row) => {
      const perUser =
        row.perUserLimit && row.perUserLimit > 0 ? `User: ${row.perUserLimit}` : "User: ∞";
      const total =
        row.totalLimit && row.totalLimit > 0 ? `Total: ${row.totalLimit}` : "Total: ∞";
      return `${perUser} | ${total}`;
    },
    size: 200,
  },
  {
    accessorKey: "redemptionsTotal",
    header: "Used",
    size: 80,
  },
  {
    id: "changeAfterUsage",
    header: "Switch After",
    accessorFn: (row) =>
      row.changeAfterUsage && row.changeAfterUsage > 0
        ? `${row.changeAfterUsage} uses`
        : "-",
    size: 140,
  },
  {
    id: "newDiscount",
    header: "New Discount",
    accessorFn: (row) => {
      if (row.newDiscountType && row.newDiscountAmount != null) {
        return row.newDiscountType === "percentage"
          ? `${row.newDiscountAmount}%`
          : `₨ ${row.newDiscountAmount}`;
      }
      return "-";
    },
    size: 140,
  },
];
