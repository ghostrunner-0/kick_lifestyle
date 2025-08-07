"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";
import Image from "next/image";
import LOGO_BLACK from "@/public/assets/images/logo-black.png";
import LOGO_WHITE from "@/public/assets/images/logo-white.png";
import { Button } from "@/components/ui/button";
import { adminAppSiderbarMenu } from "@/lib/AdminSiderbarMenu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
export function AppSidebar() {
  const {toggleSidebar} = useSidebar();
  return (
    <Sidebar className="z-50">
      <SidebarHeader className="border-b h-14 p-0">
        <div className="flex justify-between items-center px-4 mt-1">
          <Image
            src={LOGO_BLACK.src}
            height={50}
            width={125}
            className="block dark:hidden"
            alt="logo_dark"
          />
          <Image
            src={LOGO_WHITE.src}
            height={50}
            width={125}
            className="hidden dark:block"
            alt="logo_dark"
          />
          <Button type="button" size="icon" className="md:hidden " onClick={toggleSidebar}>
            <IoMdClose />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarMenu>
          {adminAppSiderbarMenu.map((menu, index) => (
            <Collapsible key={index} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton asChild className="font-semibold px-2 py-5">
                    <Link href={menu?.url}>
                      <menu.icon />
                      {menu.title}
                      {menu.subMenu && menu.subMenu.length > 0 && (
                        <LuChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {menu.subMenu && menu.subMenu.length > 0 && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {menu.subMenu.map((subMenu, subIndex) => (
                        <SidebarMenuSubItem key={subIndex}>
                          <SidebarMenuSubButton asChild className="px-2 py-5">
                            <Link href={subMenu.url}>{subMenu.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
export default AppSidebar;
