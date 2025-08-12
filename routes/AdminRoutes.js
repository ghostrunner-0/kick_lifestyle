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

export const ADMIN_PRODUCT_VARIANT_ALL = "/admin/product-variant";
export const ADMIN_PRODUCT_VARIANT_ADD = "/admin/product-variant/add";
export const ADMIN_PRODUCT_VARIANT_EDIT = (id) =>
  id ? `/admin/product-variant/edit/${id}` : "";

export const ADMIN_COUPONS_ALL = "/admin/coupon";
export const ADMIN_COUPONS_ADD = "/admin/coupon/add";
export const ADMIN_COUPONS_EDIT = (id) =>
  id ? `/admin/coupon/edit/${id}` : "";
export const ADMIN_USERS_ALL = "/admin/customers";
export const ADMIN_REVIEWS_ALL = "/admin/reviews";
