"use client";
import ThemeSwitch from "./ThemeSwitch";
import UserDropdown from "./UserDropdown";
import { Button } from "@/components/ui/button";
import { RiMenu4Fill } from "react-icons/ri";
import { useSidebar } from "@/components/ui/sidebar";
import AdminSearch from "./AdminSearch";

const TopBar = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="fixed border h-14 w-full top-0 left-0 z-30 px-5 md:pl-[18rem] pl-5 pe-5 pr-0 md:pr-10 flex justify-between items-center bg-white dark:bg-card">
      <div>
        <AdminSearch/>
      </div>
      <div className="flex items-center gap-2">
        <ThemeSwitch />
        {/* Remove asChild here */}
        <UserDropdown asChild  />
        
        {/* Remove asChild here so Button renders <button> correctly */}
        <Button
          type="button"
          className="ms-2 md:hidden"
          onClick={toggleSidebar}
          size={"icon"}
        >
          <RiMenu4Fill />
        </Button>
      </div>
    </div>
  );
};

export default TopBar;
