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
import { RiCoupon2Line } from "react-icons/ri";

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
  ADMIN_OFFLINE_REGISTRATIONS, // make sure this exists in your routes
} from "@/routes/AdminRoutes";

/**
 * NOTES:
 * - Items without a `roles` list are considered admin-only by default (we’ll set roles explicitly below).
 * - Parents are shown only if at least one child survives the role filter.
 */
export const FULL_MENU = [
  // Always keep Dashboard for admins; sales/editor do not get general dashboard.
  {
    title: "Dashboard",
    icon: AiOutlineDashboard,
    url: ADMIN_DASHBOARD,
    roles: ["admin"],
  },

  // Admin only
  {
    title: "Category",
    icon: BiCategory,
    url: "#",
    roles: ["admin"],
    subMenu: [
      { title: "Add Category", url: ADMIN_CATEGORY_ADD },
      { title: "All Category", url: ADMIN_CATEGORY_ALL },
    ],
  },

  // Admin only
  {
    title: "Products",
    icon: BsEarbuds,
    url: "#",
    roles: ["admin"],
    subMenu: [
      { title: "Add Product", url: ADMIN_Product_ADD },
      { title: "Add Variant", url: ADMIN_PRODUCT_VARIANT_ADD },
      { title: "All Products", url: ADMIN_Product_ALL },
      { title: "All Variants", url: ADMIN_PRODUCT_VARIANT_ALL },
    ],
  },

  // Admin only
  {
    title: "Coupons",
    icon: RiCoupon2Line,
    url: "#",
    roles: ["admin"],
    subMenu: [
      { title: "Add Coupons", url: ADMIN_COUPONS_ADD },
      { title: "All Coupons", url: ADMIN_COUPONS_ALL },
    ],
  },

  // Admin + sales
  {
    title: "Orders",
    icon: MdOutlineShoppingBag,
    url: ADMIN_ORDERS_ALL,
    roles: ["admin", "sales"],
  },

  // Admin only
  {
    title: "QR Payments",
    icon: MdOutlinePayments,
    url: ADMIN_QR_PAYMENT_ALL,
    roles: ["admin"],
  },

  // WEBSITE group
  {
    title: "Website",
    icon: MdOutlineWeb,
    url: "#", // parent container
    // no explicit roles on parent — children control visibility
    subMenu: [
      // Admin + sales
      {
        title: "Warranty",
        url: ADMIN_WEBSITE_WARRANTY,
        icon: LuBadgeCheck,
        roles: ["admin", "sales"],
      },
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

      // Admin + editor
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

  // Customer Service — admin + sales
  {
    title: "Customer Service",
    icon: MdSupportAgent,
    url: "#",
    roles: ["admin", "sales"],
    subMenu: [
      { title: "Offline Shops", url: ADMIN_OFFLINE_SHOPS },
      { title: "Add", url: ADMIN_add_customer_service },
      { title: "Offline", url: "#" },
      { title: "Online", url: "#" },
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

// Back-compat export (some code still imports this)
export const adminAppSiderbarMenu = FULL_MENU;

/** Build a menu for a given role. “admin” gets everything; “sales” & “editor” are filtered; “user” gets nothing. */
export function getAdminSidebar(role = "admin") {
  if (role === "admin") return FULL_MENU;

  const filterByRole = (items) =>
    items
      .map((item) => {
        const allowed = !item.roles || item.roles.includes(role);
        const children = Array.isArray(item.subMenu)
          ? filterByRole(item.subMenu)
          : undefined;

        // If the item has children, keep it only if some child remains visible
        if (children && children.length) return { ...item, subMenu: children };

        // If no children, keep the item only if it’s allowed for this role
        if (!item.subMenu && allowed) return item;

        return null;
      })
      .filter(Boolean);

  // “user” and any other roles not listed will typically see nothing
  return filterByRole(FULL_MENU);
}
