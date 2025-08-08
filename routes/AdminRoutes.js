export const ADMIN_DASHBOARD = "/admin/dashboard";
export const MEDIA_DASHBOARD = "/admin/media";

// Category Routes
export const ADMIN_CATEGORY_ALL = "/admin/category";
export const ADMIN_CATEGORY_ADD = "/admin/category/add";
export const ADMIN_CATEGORY_EDIT = (id) =>
  id ? `/admin/category/edit/${id}` : "";

// Trash route
export const ADMIN_TRASH_ROUTE = "/admin/trash";

// Product
export const ADMIN_Product_ALL = "/admin/product";
export const ADMIN_Product_ADD = "/admin/product/add";
export const ADMIN_Product_EDIT = (id) =>
  id ? `/admin/product/edit/${id}` : "";
