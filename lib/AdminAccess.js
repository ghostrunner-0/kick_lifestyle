// lib/AdminAccess.js
import { FULL_MENU } from "@/lib/AdminSiderbarMenu";
import {
  ADMIN_DASHBOARD,
  ADMIN_ORDERS_ALL,
  ADMIN_BANNERS_ALL,
} from "@/routes/AdminRoutes";

// Flatten FULL_MENU into path -> roles[]
function flattenMenuToMap(menu) {
  const map = new Map();
  const walk = (items = []) => {
    for (const it of items) {
      if (it?.url && it.url !== "#") map.set(it.url, it.roles || ["admin"]);
      if (Array.isArray(it?.subMenu)) walk(it.subMenu);
    }
  };
  walk(menu);
  return map;
}

// Extra dynamic pages not present as fixed URLs in the menu
const WILDCARDS = [
  { prefix: "/admin/orders/", roles: ["admin", "sales"] }, // order detail
  { prefix: "/admin/banners/edit/", roles: ["admin", "editor"] }, // banner edit
  { prefix: "/admin/product/edit/", roles: ["admin"] }, // product edit
  { prefix: "/admin/product-variant/edit/", roles: ["admin"] }, // variant edit
  { prefix: "/admin/coupon/edit/", roles: ["admin"] }, // coupon edit
  { prefix: "/admin/category/edit/", roles: ["admin"] }, // category edit
];

const MENU_MAP = flattenMenuToMap(FULL_MENU);

export function roleCanAccessPath(role, path) {
  const norm = String(path || "").replace(/\/+$/, "");

  // Exact menu hits
  if (MENU_MAP.has(norm)) {
    const roles = MENU_MAP.get(norm);
    return !roles || roles.includes(role);
  }

  // Wildcards
  for (const { prefix, roles } of WILDCARDS) {
    if (norm.startsWith(prefix)) return roles.includes(role);
  }

  // Default: unknown = admin only
  return role === "admin";
}

export function getDefaultLandingForRole(role) {
  if (role === "admin") return ADMIN_DASHBOARD;
  if (role === "sales") return ADMIN_ORDERS_ALL;
  if (role === "editor") return ADMIN_BANNERS_ALL;
  return "/"; // public site
}
