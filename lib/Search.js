import { ADMIN_CATEGORY_ADD, ADMIN_CATEGORY_ALL, ADMIN_COUPONS_ADD, ADMIN_COUPONS_ALL, ADMIN_DASHBOARD, ADMIN_Product_ADD, ADMIN_PRODUCT_VARIANT_ALL, ADMIN_REVIEWS_ALL, MEDIA_DASHBOARD } from "@/routes/AdminRoutes";


const searchData = [
   {
       label: "Dashboard",
       description: "View website analytics and reports",
       url: ADMIN_DASHBOARD,
       keywords: ["dashboard", "overview", "analytics", "insights"]
   },
   {
       label: "Category",
       description: "Manage product categories",
       url: ADMIN_CATEGORY_ALL,
       keywords: ["category", "product category"]
   },
   {
       label: "Add Category",
       description: "Add new product categories",
       url: ADMIN_CATEGORY_ADD,
       keywords: ["add category", "new category"]
   },
   {
       label: "Product",
       description: "Manage all product listings",
       url: ADMIN_PRODUCT_VARIANT_ALL,
       keywords: ["products", "product list"]
   },
   {
       label: "Add Product",
       description: "Add a new product to the catalog",
       url: ADMIN_Product_ADD,
       keywords: ["new product", "add product"]
   },
   {
       label: "Product Variant",
       description: "Manage all product variants",
       url: ADMIN_PRODUCT_VARIANT_ALL,
       keywords: ["products variants", "variants"]
   },
   {
       label: "Coupon",
       description: "Manage active discount coupons",
       url: ADMIN_COUPONS_ALL,
       keywords: ["discount", "promo", "coupon"]
   },
   {
       label: "Add Coupon",
       description: "Create a new discount coupon",
       url: ADMIN_COUPONS_ADD,
       keywords: ["add coupon", "new coupon", "promotion", "offers"]
   },
   {
       label: "Orders",
       description: "Manage customer orders",
       url: "#",
       keywords: ["orders"]
   },
   {
       label: "Customers",
       description: "View and manage customer information",
       url: ADMIN_COUPONS_ADD,
       keywords: ["customers", "users"]
   },
   {
       label: "Review",
       description: "Manage customer reviews and feedback",
       url: ADMIN_REVIEWS_ALL,
       keywords: ["ratings", "feedback"]
   },

   {
       label: "Media",
       description: "Manage website media files",
       url: MEDIA_DASHBOARD,
       keywords: ["images", "videos"]
   },

];

export default searchData;


