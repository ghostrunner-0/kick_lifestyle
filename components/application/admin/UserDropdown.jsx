"use client";
import React, { forwardRef } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { IoShirtOutline } from "react-icons/io5";
import { MdOutlineShoppingBag } from "react-icons/md";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LogoutButton from "./LogoutButton";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const UserDropdown = forwardRef(function UserDropdown(props, ref) {
  const auth = useSelector((store) => store.authStore.auth);
  const initials =
    auth?.name
      ?.trim()
      ?.split(/\s+/)
      ?.map((n) => n[0])
      ?.join("")
      ?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      {/* Prevent nested <button>: make the trigger use the child as the button */}
      <DropdownMenuTrigger asChild>
        <Button
          ref={ref}
          type="button"
          size="icon"
          variant="ghost"
          className="cursor-pointer p-0 h-9 w-9 rounded-full"
          aria-label="User menu"
          {...props}
        >
          <Avatar className="h-9 w-9">
            {/* <AvatarImage src="..."/> */}
            <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {auth?.name && <DropdownMenuLabel>{auth.name}</DropdownMenuLabel>}
        {auth?.role && (
          <>
            <DropdownMenuSeparator />
            <span className="font-normal text-xs ps-3">
              {auth.role.charAt(0).toUpperCase() + auth.role.slice(1)}
            </span>
          </>
        )}
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="#" className="cursor-pointer flex items-center gap-2">
            <IoShirtOutline /> <span>New Product</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="#" className="cursor-pointer flex items-center gap-2">
            <MdOutlineShoppingBag /> <span>Orders</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        {/* Ensure LogoutButton does NOT render a <button> inside another trigger/button */}
        <LogoutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default UserDropdown;
