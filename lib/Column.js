// columns.jsx
import Thumb40 from "@/components/Thumb40";

export const DT_CATEGORY_COLUMN = [
  { accessorKey: "name", header: "Category Name" },
  {
    accessorKey: "showOnWebsite",
    header: "Show On Website",
    Cell: ({ row }) => (row.original.showOnWebsite ? "✅" : "❌"),
    size: 100,
  },
  { accessorKey: "slug", header: "Slug" },
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
        <div className="flex items-center gap-2.5">
          <Thumb40 src={img?.path} alt={img?.alt || name} />
          <span className="font-medium">{name}</span>
        </div>
      );
    },
    enableSorting: true,
    size: 240,
  },
  {
    id: "price",
    header: "Price",
    accessorFn: (row) => row.specialPrice ?? row.mrp,
    Cell: ({ row }) => {
      const mrp = row.original?.mrp;
      const sp = row.original?.specialPrice;
      if (sp != null && sp !== "" && !Number.isNaN(sp)) {
        return (
          <div className="flex items-center gap-2">
            {Number.isFinite(mrp) && (
              <span className="text-gray-400 line-through">₨ {mrp}</span>
            )}
            <span>₨ {sp}</span>
          </div>
        );
      }
      return Number.isFinite(mrp) ? <span>₨ {mrp}</span> : "-";
    },
    size: 140,
  },
  {
    id: "warranty",
    header: "Warranty",
    accessorFn: (row) => row.warrantyMonths,
    Cell: ({ row }) => {
      const wm = row.original?.warrantyMonths;
      return Number.isFinite(wm) ? <span>{wm} months</span> : <span>-</span>;
    },
    size: 120,
  },
  { accessorKey: "categoryName", header: "Category", size: 160 },
  {
    id: "visible",
    header: "Visible",
    accessorFn: (row) => Boolean(row.showInWebsite),
    Cell: ({ row }) => (row.original?.showInWebsite ? "✅" : "❌"),
    size: 80,
  },
];

export const DT_PRODUCT_VARIANT_COLUMN = [
  {
    id: "variant",
    header: "Variant",
    accessorFn: (row) => row.variantName,
    Cell: ({ row }) => {
      const img = row.original?.swatchImage;
      const name = row.original?.variantName || "-";
      return (
        <div className="flex items-center gap-2.5">
          <Thumb40 src={img?.path} alt={img?.alt || name} />
          <span className="font-medium">{name}</span>
        </div>
      );
    },
    enableSorting: true,
    size: 240,
  },
  {
    id: "productName",
    header: "Product",
    accessorFn: (row) => row.productName ?? row?.product?.name ?? "",
    Cell: ({ row }) => {
      const name =
        row.original?.productName ?? row.original?.product?.name ?? "-";
      return <span>{name}</span>;
    },
    size: 220,
  },
  {
    id: "price",
    header: "Price",
    accessorFn: (row) => row.specialPrice ?? row.mrp,
    Cell: ({ row }) => {
      const mrp = row.original?.mrp;
      const sp = row.original?.specialPrice;
      if (sp != null && sp !== "" && !Number.isNaN(sp)) {
        return (
          <div className="flex items-center gap-2">
            {Number.isFinite(mrp) && (
              <span className="text-gray-400 line-through">₨ {mrp}</span>
            )}
            <span>₨ {sp}</span>
          </div>
        );
      }
      return Number.isFinite(mrp) ? <span>₨ {mrp}</span> : "-";
    },
    size: 140,
  },
  { accessorKey: "sku", header: "SKU", size: 160 },
  {
    id: "galleryCount",
    header: "Gallery",
    accessorFn: (row) =>
      Array.isArray(row.productGallery) ? row.productGallery.length : 0,
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
    Cell: ({ row }) => (
      <span className="font-semibold">{row.original.code}</span>
    ),
  },
  {
    id: "discount",
    header: "Discount",
    accessorFn: (row) =>
      `${row.discountAmount} ${row.discountType === "percentage" ? "%" : "₨"}`,
    Cell: ({ row }) => {
      const { discountType, discountAmount } = row.original;
      return (
        <span>
          {discountType === "percentage"
            ? `${discountAmount}%`
            : `₨ ${discountAmount}`}
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
      if (row.specificProducts?.length)
        return `${row.specificProducts.length} Product(s)`;
      if (row.specificVariants?.length)
        return `${row.specificVariants.length} Variant(s)`;
      return "All Products";
    },
    size: 180,
  },
  {
    id: "limits",
    header: "Usage Limits",
    accessorFn: (row) => {
      const perUser =
        row.perUserLimit && row.perUserLimit > 0
          ? `User: ${row.perUserLimit}`
          : "User: ∞";
      const total =
        row.totalLimit && row.totalLimit > 0
          ? `Total: ${row.totalLimit}`
          : "Total: ∞";
      return `${perUser} | ${total}`;
    },
    size: 200,
  },
  { accessorKey: "redemptionsTotal", header: "Used", size: 80 },
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

export const DT_USER_COLUMN = [
  {
    id: "user",
    header: "User",
    accessorFn: (row) => row.name,
    Cell: ({ row }) => {
      const name = row.original?.name || "-";
      const email = row.original?.email || "-";
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return (
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-gray-500">{email}</span>
          </div>
        </div>
      );
    },
    enableSorting: true,
    size: 280,
  },
  {
    accessorKey: "role",
    header: "Role",
    size: 120,
    Cell: ({ row }) => {
      const role = row.original?.role || "user";
      const roleColors = {
        admin: "text-red-500",
        shopkeeper: "text-amber-500",
        user: "text-green-500",
      };
      return (
        <span className={`${roleColors[role] || "text-gray-500"} font-medium`}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    size: 140,
    Cell: ({ row }) => row.original?.phone || "-",
  },
  {
    id: "verified",
    header: "Email Verified",
    accessorFn: (row) => Boolean(row.isEmailVerified),
    Cell: ({ row }) => (row.original?.isEmailVerified ? "✅" : "❌"),
    size: 100,
  },
];

export const DT_REVIEW_COLUMN = [
  {
    id: "user",
    header: "User",
    accessorFn: (row) => row.userInfo?.name ?? "Unknown User",
    Cell: ({ row }) => {
      const user = row.original?.userInfo;
      const name = user?.name || "Unknown User";
      const email = user?.email || "-";
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return (
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-gray-500">{email}</span>
          </div>
        </div>
      );
    },
    enableSorting: true,
    size: 280,
  },
  {
    id: "product",
    header: "Product",
    accessorFn: (row) => row.productInfo?.name ?? "Unknown Product",
    Cell: ({ row }) => {
      const product = row.original?.productInfo;
      const name = product?.name || "Unknown Product";
      const img = product?.heroImage || product?.images?.[0] || null;

      return (
        <div className="flex items-center gap-2.5">
          <Thumb40 src={img?.path} alt={img?.alt || name} />
          <span className="font-medium">{name}</span>
        </div>
      );
    },
    enableSorting: true,
    size: 240,
  },
  {
    accessorKey: "rating",
    header: "Rating",
    Cell: ({ row }) => {
      const rating = row.original?.rating ?? 0;
      return <span>{rating} ⭐</span>;
    },
    enableSorting: true,
    size: 100,
  },
  { accessorKey: "title", header: "Title", size: 200, enableSorting: true },
  {
    accessorKey: "status",
    header: "Status",
    Cell: ({ row }) => {
      const status = row.original?.status || "spam";
      const colors = {
        approved: "text-green-500",
        unapproved: "text-amber-500",
        spam: "text-red-500",
      };
      return (
        <span className={`${colors[status] || "text-gray-500"} font-semibold`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    },
    enableSorting: true,
    size: 120,
  },
];
