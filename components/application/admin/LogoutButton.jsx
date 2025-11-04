"use client";

import React from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { HiOutlineLogout } from "react-icons/hi";
import { showToast } from "@/lib/ShowToast";
import { logout } from "@/lib/logout";

const LogoutButton = () => {
  const handleLogout = async () => {
    try {
      await logout({ redirectTo: "/auth/login" });
      showToast("success", "Logged out successfully");
    } catch (err) {
      console.error("Logout error:", err);
      showToast("error", "Logout failed. Please try again.");
    }
  };

  return (
    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
      <HiOutlineLogout color="red" />
      Logout
    </DropdownMenuItem>
  );
};

export default LogoutButton;
