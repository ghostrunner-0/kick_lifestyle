"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import ThemeSwitch from "./ThemeSwitch";
import UserDropdown from "./UserDropdown";
import AdminSearch from "./AdminSearch";

const TopBar = () => {
  return (
    <header
      className={[
        "sticky top-0 z-30 border-b",
        "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "transition-[width,height] ease-linear",
      ].join(" ")}
      style={{ ["--header-height"]: "56px" }}
    >
      <div className="flex h-[var(--header-height)] items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <div className="min-w-0 flex-1">
          <AdminSearch />
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
