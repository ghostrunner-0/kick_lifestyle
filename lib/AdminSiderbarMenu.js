// Admin Sidebar icons.
import { AiOutlineDashboard } from "react-icons/ai";
import { BiCategory } from "react-icons/bi";
import { IoShirtOutline } from "react-icons/io5";
import { MdOutlineShoppingBag } from "react-icons/md";
import { LuUserRound } from "react-icons/lu";
import { IoMdStarOutline } from "react-icons/io";
import { MdOutlinePermMedia } from "react-icons/md";
import { RiCoupon2Line } from "react-icons/ri";
import { ADMIN_CATEGORY_ADD, ADMIN_CATEGORY_ALL, ADMIN_DASHBOARD, MEDIA_DASHBOARD } from "@/routes/AdminRoutes";
export const adminAppSiderbarMenu = [
  { title: "Dashboard", icon: AiOutlineDashboard, url: ADMIN_DASHBOARD },
  {
    title: "Category",
    icon: BiCategory,
    url: "#",
    subMenu: [
      {
        title: "Add Category",
        url: ADMIN_CATEGORY_ADD,
      },
      {
        title: "All Category",
        url: ADMIN_CATEGORY_ALL,
      },
    ],
  },
  {
    title: "Products",
    icon: IoShirtOutline,
    url: "#",
    subMenu: [
      {
        title: "Add Product",
        url: "#",
      },
      {
        title: "Add Variant",
        url: "#",
      },
      {
        title: "All Products",
        url: "#",
      },
      {
        title: "All Variants",
        url: "#",
      },
    ],
  },
  {
    title: "Coupons",
    icon: RiCoupon2Line,
    url: "#",
    subMenu: [
      {
        title: "Add Coupons",
        url: "#",
      },
      {
        title: "All Coupons",
        url: "#",
      },
    ],
  },
  { title: "Orders", icon: MdOutlineShoppingBag, url: "#" },
  { title: "Customers", icon: LuUserRound, url: "#" },
  { title: "Rating & Reviews", icon: IoMdStarOutline, url: "#" },
  { title: "Media", icon: MdOutlinePermMedia, url: MEDIA_DASHBOARD },
];
