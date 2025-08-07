import React from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { HiOutlineLogout } from "react-icons/hi";

import { signOut } from "next-auth/react";
import { useDispatch } from "react-redux";
import { logout } from "@/store/reducer/AuthReducer"; // your authSlice actions
import { showToast } from "@/lib/ShowToast";
const LogoutButton = () => {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    dispatch(logout());
    showToast("success", "Logged Out Successfully");
    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <DropdownMenuItem onClick={handleLogout} className={"cursor-pointer"}>
      <HiOutlineLogout color="red" /> Logout
    </DropdownMenuItem>
  );
};

export default LogoutButton;
