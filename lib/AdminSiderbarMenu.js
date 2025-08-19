// Admin Sidebar icons.
import { AiOutlineDashboard } from "react-icons/ai";
import { BiCategory } from "react-icons/bi";
import { BsEarbuds } from "react-icons/bs";
import { MdOutlineShoppingBag } from "react-icons/md";
import { LuUserRound } from "react-icons/lu";
import { IoMdStarOutline } from "react-icons/io";
import { MdOutlinePermMedia } from "react-icons/md";
import { RiCoupon2Line } from "react-icons/ri";
import { BsImageAlt } from "react-icons/bs";
import { MdOutlinePayments } from "react-icons/md";

import {
  ADMIN_BANNERS_ALL,
  ADMIN_CATEGORY_ADD,
  ADMIN_CATEGORY_ALL,
  ADMIN_COUPONS_ADD,
  ADMIN_COUPONS_ALL,
  ADMIN_DASHBOARD,
  ADMIN_Product_ADD,
  ADMIN_Product_ALL,
  ADMIN_PRODUCT_VARIANT_ADD,
  ADMIN_PRODUCT_VARIANT_ALL,
  ADMIN_QR_PAYMENT_ADD,
  ADMIN_QR_PAYMENT_ALL,
  ADMIN_REVIEWS_ALL,
  ADMIN_USERS_ALL,
  MEDIA_DASHBOARD,
} from "@/routes/AdminRoutes";
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
    icon: BsEarbuds,
    url: "#",
    subMenu: [
      {
        title: "Add Product",
        url: ADMIN_Product_ADD,
      },
      {
        title: "Add Variant",
        url: ADMIN_PRODUCT_VARIANT_ADD,
      },
      {
        title: "All Products",
        url: ADMIN_Product_ALL,
      },
      {
        title: "All Variants",
        url: ADMIN_PRODUCT_VARIANT_ALL,
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
        url: ADMIN_COUPONS_ADD,
      },
      {
        title: "All Coupons",
        url: ADMIN_COUPONS_ALL,
      },
    ],
  },
  { title: "Orders", icon: MdOutlineShoppingBag, url: "#" },
  { title: "QR Payments", icon: MdOutlinePayments, url: ADMIN_QR_PAYMENT_ALL },
  { title: "Customers", icon: LuUserRound, url: ADMIN_USERS_ALL },

  { title: "Rating & Reviews", icon: IoMdStarOutline, url: ADMIN_REVIEWS_ALL },
  { title: "Banners", icon: BsImageAlt, url: ADMIN_BANNERS_ALL },
  { title: "Media", icon: MdOutlinePermMedia, url: MEDIA_DASHBOARD },
];
