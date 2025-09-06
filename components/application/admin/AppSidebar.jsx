"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";
import Image from "next/image";
import LOGO_BLACK from "@/public/assets/images/logo-black.png";
import LOGO_WHITE from "@/public/assets/images/logo-white.png";
import KICK_MINI from "@/public/assets/images/kick-logo.png";
import { Button } from "@/components/ui/button";
import { adminAppSiderbarMenu } from "@/lib/AdminSiderbarMenu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* utilities */
function isActive(pathname, url) {
  if (!url || url === "#") return false;
  const a = pathname.replace(/\/+$/, "");
  const b = url.replace(/\/+$/, "");
  return a === b || a.startsWith(b + "/");
}

function useLocalSections() {
  const KEY = "admin.sidebar.sections";
  const [map, setMap] = useState(() => {
    try {
      if (typeof window === "undefined") return {};
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY, JSON.stringify(map));
    } catch {}
  }, [map]);

  return [map, setMap];
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { open, toggleSidebar, isMobile } = useSidebar();
  const [sections, setSections] = useLocalSections();

  const handleAfterNav = () => {
    if (isMobile) toggleSidebar();
  };

  return (
    <Sidebar collapsible="icon" className="z-50">
      <SidebarHeader className="border-b h-[56px] p-0">
        <div className="flex items-center justify-between px-3">
          {open ? (
            <>
              <Image
                src={LOGO_BLACK}
                height={44}
                width={110}
                className="block dark:hidden"
                alt="KICK"
                priority
              />
              <Image
                src={LOGO_WHITE}
                height={44}
                width={110}
                className="hidden dark:block"
                alt="KICK"
                priority
              />
            </>
          ) : (
            <Image
              src={KICK_MINI}
              height={28}
              width={28}
              alt="K"
              className="mx-2"
              priority
            />
          )}

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="lg:hidden"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            <IoMdClose />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {adminAppSiderbarMenu.map((menu, i) => {
            const hasChildren = !!menu.subMenu?.length;
            const parentActive =
              isActive(pathname, menu.url) ||
              (hasChildren && menu.subMenu.some((s) => isActive(pathname, s.url)));

            const secKey = menu.title || `section-${i}`;
            const isOpen = sections[secKey] ?? parentActive ?? false;
            const setOpen = (v) =>
              setSections((m) => ({ ...m, [secKey]: Boolean(v) }));

            return (
              <Collapsible
                key={secKey}
                className="group/collapsible"
                open={isOpen}
                onOpenChange={setOpen}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      isActive={parentActive}
                      tooltip={menu.title}
                      className={[
                        "flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-colors",
                        parentActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60",
                      ].join(" ")}
                    >
                      <Link
                        href={menu.url || "#"}
                        onClick={handleAfterNav}
                        aria-current={parentActive ? "page" : undefined}
                        className="flex w-full items-center"
                      >
                        {menu.icon ? <menu.icon className="shrink-0" /> : null}
                        <span className="truncate">{menu.title}</span>
                        {hasChildren && (
                          <LuChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  {hasChildren && (
                    <CollapsibleContent>
                      <SidebarMenuSub className="mt-1">
                        {menu.subMenu.map((sub, j) => {
                          const subActive = isActive(pathname, sub.url);
                          const subKey = sub.title || sub.url || `sub-${i}-${j}`;
                          return (
                            <SidebarMenuSubItem key={subKey}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subActive}
                                tooltip={sub.title}
                                className={[
                                  "px-2 py-2 rounded-md transition-colors",
                                  subActive
                                    ? "bg-accent text-foreground"
                                    : "text-muted-foreground hover:bg-accent/60",
                                ].join(" ")}
                              >
                                <Link
                                  href={sub.url}
                                  onClick={handleAfterNav}
                                  aria-current={subActive ? "page" : undefined}
                                >
                                  {sub.title}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t p-3 text-xs text-muted-foreground">
        <div className="flex justify-between w-full">
          <span>Admin</span>
          <span className="opacity-70">v1.0</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
