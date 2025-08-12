import { ADMIN_CATEGORY_ADD, ADMIN_COUPONS_ADD, ADMIN_Product_ADD, MEDIA_DASHBOARD } from "@/routes/AdminRoutes";
import Link from "next/link";
import React from "react";
import { BiCategory } from "react-icons/bi"; // Add Category
import { MdOutlineProductionQuantityLimits } from "react-icons/md"; // Add Product
import { RiCoupon3Line } from "react-icons/ri"; // Add Coupon
import { HiOutlinePhoto } from "react-icons/hi2"; // Add Media

const QuickAdd = () => {
  const cards = [
    {
      title: "Add Category",
      icon: BiCategory,
      gradient: "from-green-400 via-green-500 to-green-600",
      href: ADMIN_CATEGORY_ADD,
    },
    {
      title: "Add Product",
      icon: MdOutlineProductionQuantityLimits,
      gradient: "from-blue-400 via-blue-500 to-blue-600",
      href: ADMIN_Product_ADD,
    },
    {
      title: "Add Coupon",
      icon: RiCoupon3Line,
      gradient: "from-amber-400 via-amber-500 to-amber-600",
      href: ADMIN_COUPONS_ADD,
    },
    {
      title: "Add Media",
      icon: HiOutlinePhoto,
      gradient: "from-purple-400 via-purple-500 to-purple-600",
      href: MEDIA_DASHBOARD,
    },
  ];

  return (
    <div className="grid lg:grid-cols-4 sm:grid-cols-2 sm:gap-10 gap-5 mt-10">
      {cards.map(({ title, icon: Icon, gradient, href }, idx) => (
        <Link href={href} key={idx}>
          <div
            className={`flex items-center justify-between p-3 rounded-lg shadow bg-white dark:bg-card bg-gradient-to-tr ${gradient}`}
          >
            <h4 className="font-medium text-white dark:text-black">{title}</h4>
            <span className="w-12 h-12 border dark:border-white flex justify-center items-center rounded-full text-white">
              <Icon size={22} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default QuickAdd;
