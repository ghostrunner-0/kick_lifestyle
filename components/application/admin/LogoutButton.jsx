"use client";

import React, { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { HiOutlineLogout } from "react-icons/hi";
import { signOut } from "next-auth/react";
import { showToast } from "@/lib/ShowToast";
// use relative import if your @ alias is unreliable:
import { logoutCleanup } from "../../lib/logoutCleanup.js";

const LogoutButton = () => {
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logoutCleanup(); // clear redux + persist + caches
      showToast("success", "Logged Out Successfully");
      await signOut({ callbackUrl: "/auth/login" }); // clear NextAuth cookies
    } catch (err) {
      console.error(err);
      showToast("error", "Logout failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <DropdownMenuItem
      onClick={handleLogout}
      className={`cursor-pointer ${
        busy ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <HiOutlineLogout color="red" />
      <span className="ml-2">{busy ? "Logging out..." : "Logout"}</span>
    </DropdownMenuItem>
  );
};

export default LogoutButton;
