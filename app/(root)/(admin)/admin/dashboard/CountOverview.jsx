import { ADMIN_CATEGORY_ALL, ADMIN_COUPONS_ALL, ADMIN_Product_ALL } from "@/routes/AdminRoutes";
import Link from "next/link";
import React from "react";
import { BiCategory } from "react-icons/bi"; // Category
import { BsEarbuds } from "react-icons/bs";
import { LuUserRound } from "react-icons/lu"; // Customers
import { MdOutlineShoppingBag } from "react-icons/md"; // Orders

const CountOverview = ({
  totals = { categories: 10, products: 120, customers: 840, orders: 415 },
}) => { 
  const cards = [
    {
      key: "categories",
      title: "Total Categories",
      value: totals.categories,
      href: ADMIN_CATEGORY_ALL,
      icon: BiCategory,
      borderColor: "border-l-green-400",
      badgeColor: "bg-green-500",
    },
    {
      key: "products",
      title: "Total Products",
      value: totals.products,
      href: ADMIN_Product_ALL,
      icon: BsEarbuds,
      borderColor: "border-l-blue-400",
      badgeColor: "bg-blue-500",
    },
    {
      key: "customers",
      title: "Total Customers",
      value: totals.customers,
      href: ADMIN_COUPONS_ALL,
      icon: LuUserRound,
      borderColor: "border-l-amber-400",
      badgeColor: "bg-amber-500",
    },
    {
      key: "orders",
      title: "Total Orders",
      value: totals.orders,
      href: '#',
      icon: MdOutlineShoppingBag,
      borderColor: "border-l-purple-400",
      badgeColor: "bg-purple-500",
    },
  ];

  return (
    <div className="grid lg:grid-cols-4 sm:grid-cols-2 sm:gap-10 gap-5">
      {cards.map(({ key, title, value, href, icon: Icon, borderColor, badgeColor }) => (
        <Link key={key} href={href}>
          <div
            className={`flex items-center justify-between p-3 rounded-lg border shadow bg-white dark:bg-card border-l-4 ${borderColor}
                        transition hover:shadow-md focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-300`}
          >
            <div>
              <h4 className="font-medium text-gray-500 dark:text-gray-400">{title}</h4>
              <span className="text-xl font-bold">{value}</span>
            </div>
            <div>
              <span
                className={`w-12 h-12 border flex justify-center items-center rounded-full text-white ${badgeColor}`}
              >
                <Icon size={22} />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default CountOverview;
