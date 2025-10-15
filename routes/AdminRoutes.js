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
export const ADMIN_BANNERS_ALL = "/admin/banners";  
export const ADMIN_QR_PAYMENT_ADD = "/admin/qr/add";  
export const ADMIN_QR_PAYMENT_ALL = "/admin/qr";  
export const ADMIN_BANNERS_ADD = "/admin/banners/add";
export const ADMIN_WEBSITE_WARRANTY = "/admin/website-warranty";
export const ADMIN_OFFLINE_SHOPS = "/admin/offline-shops";
export const ADMIN_add_customer_service = "/admin/customer-service/add";
export const ADMIN_BANNERS_EDIT = (id) =>
  id ? `/admin/banners/edit/${id}` : "";

export const ADMIN_ORDERS_ALL = "/admin/orders";
export const ADMIN_DARAZ_MAPPING = "/admin/mapping";
export const ADMIN_DARAZ_WARRANTY = "/admin/daraz-warranty";
export const ADMIN_MANUAL_WARRANTY = "/admin/warranty";
export const ADMIN_COST_SHEET = "/admin/customer-service/cost-sheet";
export const ADMIN_WARRANTY = "/admin/warranty/list";
export const ADMIN_HOME_MID_BANNER = "/admin/homebanner";
export const STUDENT_DISCOUNT = "/admin/student-discount";
export const ADMIN_OFFLINE_REGISTRATIONS = "/admin/offline-registration";
export const ADMIN_ORDERS_EDIT =(id) =>
  id ? `/admin/orders/${id}` : "";


export const ADMIN_INTEGRATIONS = "/admin/integrations";