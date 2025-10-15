// lib/AdminSiderbarMenu.js

// Icons
import { AiOutlineDashboard } from "react-icons/ai";
import { BiCategory } from "react-icons/bi";
import { BsEarbuds, BsImageAlt } from "react-icons/bs";
import {
  MdOutlineShoppingBag,
  MdOutlinePayments,
  MdOutlinePermMedia,
  MdSupportAgent,
  MdOutlineWeb,
} from "react-icons/md";
import { LuUserRound, LuBadgeCheck } from "react-icons/lu";
import { IoMdStarOutline } from "react-icons/io";
import { RiCoupon2Line, RiPuzzle2Line } from "react-icons/ri";

// Routes
import {
  ADMIN_add_customer_service,
  ADMIN_BANNERS_ALL,
  ADMIN_CATEGORY_ADD,
  ADMIN_CATEGORY_ALL,
  ADMIN_COUPONS_ADD,
  ADMIN_COUPONS_ALL,
  ADMIN_DASHBOARD,
  ADMIN_HOME_MID_BANNER,
  ADMIN_OFFLINE_SHOPS,
  ADMIN_ORDERS_ALL,
  ADMIN_Product_ADD,
  ADMIN_Product_ALL,
  ADMIN_PRODUCT_VARIANT_ADD,
  ADMIN_PRODUCT_VARIANT_ALL,
  ADMIN_QR_PAYMENT_ALL,
  ADMIN_REVIEWS_ALL,
  ADMIN_USERS_ALL,
  ADMIN_WEBSITE_WARRANTY,
  MEDIA_DASHBOARD,
  STUDENT_DISCOUNT,
  ADMIN_OFFLINE_REGISTRATIONS,
  // Make sure this exists in your AdminRoutes:
  // export const ADMIN_INTEGRATIONS = "/admin/integrations";
  ADMIN_INTEGRATIONS,
  ADMIN_DARAZ_MAPPING,
  ADMIN_DARAZ_WARRANTY,
  ADMIN_MANUAL_WARRANTY,
  ADMIN_WARRANTY,
  ADMIN_COST_SHEET,
} from "@/routes/AdminRoutes";

/**
 * Roles:
 * - admin: full access
 * - sales: Orders, Website (Warranty, Student Discount, Offline Registrations), Customer Service
 * - editor: Website (Home Banners, Banners)
 * - user: no admin portal items
 *
 * NOTE: Every node below has an explicit `roles` array.
 */
export const FULL_MENU = [
  // Admin dashboard
  {
    title: "Dashboard",
    icon: AiOutlineDashboard,
    url: ADMIN_DASHBOARD,
    roles: ["admin"],
  },

  // Integrations (admin only)
  {
    title: "Integrations",
    icon: RiPuzzle2Line,
    url: ADMIN_INTEGRATIONS,
    roles: ["admin"],
  },
  {
    title: "Product Mapping",
    icon: RiPuzzle2Line,
    url: ADMIN_DARAZ_MAPPING,
    roles: ["admin"],
  },

  // Category (admin only)
  {
    title: "Category",
    icon: BiCategory,
    url: "#",
    roles: ["admin"],
    subMenu: [
      { title: "Add Category", url: ADMIN_CATEGORY_ADD, roles: ["admin"] },
      { title: "All Category", url: ADMIN_CATEGORY_ALL, roles: ["admin"] },
    ],
  },

  // Products (admin only)
  {
    title: "Products",
    icon: BsEarbuds,
    url: "#",
    roles: ["admin"],
    subMenu: [
      { title: "Add Product", url: ADMIN_Product_ADD, roles: ["admin"] },
      {
        title: "Add Variant",
        url: ADMIN_PRODUCT_VARIANT_ADD,
        roles: ["admin"],
      },
      { title: "All Products", url: ADMIN_Product_ALL, roles: ["admin"] },
      {
        title: "All Variants",
        url: ADMIN_PRODUCT_VARIANT_ALL,
        roles: ["admin"],
      },
    ],
  },

  // Coupons (admin only)
  {
    title: "Coupons",
    icon: RiCoupon2Line,
    url: "#",
    roles: ["admin"],
    subMenu: [
      { title: "Add Coupons", url: ADMIN_COUPONS_ADD, roles: ["admin"] },
      { title: "All Coupons", url: ADMIN_COUPONS_ALL, roles: ["admin"] },
    ],
  },

  // Orders (admin + sales)
  {
    title: "Orders",
    icon: MdOutlineShoppingBag,
    url: ADMIN_ORDERS_ALL,
    roles: ["admin", "sales"],
  },

  // QR Payments (admin + sales)
  {
    title: "QR Payments",
    icon: MdOutlinePayments,
    url: ADMIN_QR_PAYMENT_ALL,
    roles: ["admin", "sales"],
  },

  // Website (parent: union of children roles)
  {
    title: "Website",
    icon: MdOutlineWeb,
    url: "#",
    roles: ["admin", "sales", "editor"],
    subMenu: [
      // Admin + Sales

      {
        title: "Student Discount",
        url: STUDENT_DISCOUNT,
        icon: LuBadgeCheck,
        roles: ["admin", "sales"],
      },
      {
        title: "Offline Registrations",
        url: ADMIN_OFFLINE_REGISTRATIONS,
        icon: LuBadgeCheck,
        roles: ["admin", "sales"],
      },

      // Admin + Editor
      {
        title: "Home Banners",
        url: ADMIN_HOME_MID_BANNER,
        icon: BsImageAlt,
        roles: ["admin", "editor"],
      },
      {
        title: "Banners",
        url: ADMIN_BANNERS_ALL,
        icon: BsImageAlt,
        roles: ["admin", "editor"],
      },
    ],
  },
  {
    title: "Warranty",
    icon: MdOutlineWeb,
    url: "#",
    roles: ["admin", "sales"],
    subMenu: [
      // Admin + Sales
      {
        title: "List",
        url: ADMIN_WARRANTY,
        icon: LuBadgeCheck,
        roles: ["admin", "sales"],
      },
      {
        title: "Website",
        url: ADMIN_WEBSITE_WARRANTY,
        icon: LuBadgeCheck,
        roles: ["admin", "sales"],
      },
      {
        title: "Daraz",
        url: ADMIN_DARAZ_WARRANTY,
        icon: LuBadgeCheck,
        roles: ["admin", "sales"],
      },
      {
        title: "Manual",
        url: ADMIN_MANUAL_WARRANTY,
        icon: LuBadgeCheck,
        roles: ["admin", "sales"],
      },
    ],
  },

  // Customer Service (admin + sales)
  {
    title: "Customer Service",
    icon: MdSupportAgent,
    url: "#",
    roles: ["admin", "sales"],
    subMenu: [
      {
        title: "Offline Shops",
        url: ADMIN_OFFLINE_SHOPS,
        roles: ["admin", "sales"],
      },
      {
        title: "Add",
        url: ADMIN_add_customer_service,
        roles: ["admin", "sales"],
      },
      { title: "Offline", url: "#", roles: ["admin", "sales"] },
      { title: "Cost Sheet", url: ADMIN_COST_SHEET, roles: ["admin", "sales"] },
      { title: "Online", url: "#", roles: ["admin", "sales"] },
    ],
  },

  // Admin only
  {
    title: "Customers",
    icon: LuUserRound,
    url: ADMIN_USERS_ALL,
    roles: ["admin"],
  },
  {
    title: "Rating & Reviews",
    icon: IoMdStarOutline,
    url: ADMIN_REVIEWS_ALL,
    roles: ["admin"],
  },
  {
    title: "Media",
    icon: MdOutlinePermMedia,
    url: MEDIA_DASHBOARD,
    roles: ["admin"],
  },
];

// Back-compat export
export const adminAppSiderbarMenu = FULL_MENU;

/**
 * Build role-filtered menu.
 * - Admin gets everything.
 * - Others: only items whose `roles` explicitly include the role.
 * - If a parent has no allowed children for that role, the parent is hidden.
 * - SAFE DEFAULT: If an item has no `roles`, it is treated as admin-only.
 */
export function getAdminSidebar(role = "admin") {
  const r = role || "user";

  const allow = (item) => {
    // Safe default: no roles -> admin-only
    if (!Array.isArray(item.roles) || item.roles.length === 0) {
      return r === "admin";
    }
    return item.roles.includes(r);
  };

  const filterByRole = (items) =>
    (items || [])
      .map((item) => {
        const children = Array.isArray(item.subMenu)
          ? filterByRole(item.subMenu)
          : undefined;
        const selfAllowed = allow(item);

        // Keep parent if:
        // - it is allowed itself, OR
        // - it has any visible children
        if ((children && children.length) || selfAllowed) {
          return children ? { ...item, subMenu: children } : item;
        }
        return null;
      })
      .filter(Boolean);

  return r === "admin" ? FULL_MENU : filterByRole(FULL_MENU);
}
