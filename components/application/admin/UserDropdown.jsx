"use client";
import React, { forwardRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSelector } from "react-redux";
import Link from "next/link";

import { IoShirtOutline } from "react-icons/io5";
import { MdOutlineShoppingBag } from "react-icons/md";
import LogoutButton from "./LogoutButton";

const UserDropdown = forwardRef(({ ...props }, ref) => {
  const auth = useSelector((store) => store.authStore.auth);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger ref={ref} {...props}>
        <Avatar>
          {/* <AvatarImage src="https://github.com/shadcn.png" /> */}
          <AvatarFallback>
            {auth?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{auth?.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <span className="font-normal text-xs ps-3">
          {auth?.role?.charAt(0).toUpperCase() + auth?.role?.slice(1)}
        </span>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={"#"} className="cursor-pointer flex items-center gap-2">
            <IoShirtOutline /> <span>New Product</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={"#"} className="cursor-pointer flex items-center gap-2">
            <MdOutlineShoppingBag /> <span>Orders</span>
          </Link>
        </DropdownMenuItem>
        <LogoutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

UserDropdown.displayName = "UserDropdown";

export default UserDropdown;
