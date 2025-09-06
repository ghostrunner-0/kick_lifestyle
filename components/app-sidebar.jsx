"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconInnerShadowTop, IconFolder, IconChevronRight } from "@tabler/icons-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { adminAppSiderbarMenu } from "@/lib/AdminSiderbarMenu";

/* utils */
const isActive = (pathname, url) => {
  if (!url || url === "#") return false;
  const a = pathname.replace(/\/+$/, "");
  const b = url.replace(/\/+$/, "");
  return a === b || a.startsWith(b + "/");
};

const ItemIcon = ({ Comp, className = "size-4" }) => {
  if (!Comp) return <IconFolder className={className} />;
  try {
    const C = Comp;
    return <C className={className} />;
  } catch {
    return <IconFolder className={className} />;
  }
};

/* full-bleed row (hover and active share same width) */
function Row({ active, children, className = "" }) {
  return (
    <div
      className={[
        "group/row relative flex w-full items-center rounded-md px-3 py-2 text-sm",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        "transition-colors",
        className,
      ].join(" ")}
    >
      {/* left accent */}
      <span
        className={[
          "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r",
          active ? "bg-primary/90" : "bg-transparent group-hover/row:bg-primary/50",
          "transition-colors",
        ].join(" ")}
      />
      {children}
    </div>
  );
}

function AppSidebar(props) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* Brand */}
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/admin/dashboard" className="block w-full">
              <Row active={isActive(pathname, "/admin/dashboard")}>
                <IconInnerShadowTop className="size-5" />
                <span className="ml-2 text-base font-semibold tracking-wide">Kick Lifestyle</span>
              </Row>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Single list; parents with subMenu are collapsible; same full-width container for hover+active */}
      <SidebarContent className="p-2">
        <SidebarMenu className="space-y-1">
          {(adminAppSiderbarMenu || []).map((item, i) => {
            const hasChildren = Array.isArray(item.subMenu) && item.subMenu.length > 0;
            const parentActive =
              isActive(pathname, item.url) ||
              (hasChildren && item.subMenu.some((s) => isActive(pathname, s.url)));
            const key = item.title || `menu-${i}`;

            if (!hasChildren) {
              return (
                <SidebarMenuItem key={key}>
                  <Link
                    href={item.url || "#"}
                    aria-current={parentActive ? "page" : undefined}
                    className="block w-full"
                  >
                    <Row active={parentActive}>
                      <ItemIcon Comp={item.icon} />
                      <span className="ml-2 truncate">{item.title}</span>
                    </Row>
                  </Link>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={key} className="overflow-hidden">
                <ParentWithChildren
                  item={item}
                  defaultOpen={parentActive}
                  parentActive={parentActive}
                  pathname={pathname}
                />
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

/* Parent: clicking the whole title block toggles; active + hover share same full width.
   Submenu uses NO outer padding so active bg = hover bg width.
*/
function ParentWithChildren({ item, defaultOpen, parentActive, pathname }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  const toggle = React.useCallback(() => setOpen((v) => !v), []);

  return (
    <div className="w-full">
      {/* whole row toggles submenu */}
      <button type="button" onClick={toggle} aria-expanded={open} className="block w-full text-left">
        <Row active={parentActive} className="pr-2">
          <ItemIcon Comp={item.icon} />
          <span className="ml-2 truncate">{item.title}</span>
          {/* caret */}
          <span className="ml-auto rounded-md p-1.5 hover:bg-accent/60">
            <IconChevronRight
              className={[
                "size-4 transition-transform duration-200",
                open ? "rotate-90" : "",
                parentActive ? "opacity-100" : "opacity-70 group-hover/row:opacity-100",
              ].join(" ")}
            />
          </span>
        </Row>
      </button>

      {/* submenu list — no outer padding; indent handled inside Row so active/hover widths match */}
      <div className={open ? "block" : "hidden"}>
        <SidebarMenuSub className="mt-1 space-y-1">
          {item.subMenu.map((sub, j) => {
            const subActive = isActive(pathname, sub.url);
            const subKey = sub.title || sub.url || `sub-${j}`;
            return (
              <SidebarMenuSubItem key={subKey}>
                <SidebarMenuSubButton asChild className="data-[slot=sidebar-menu-sub-button]:!p-0">
                  <Link href={sub.url || "#"} aria-current={subActive ? "page" : undefined} className="block w-full">
                    {/* indent INSIDE the row so background is still full width */}
                    <Row active={subActive} className="pl-8">
                      <span
                        className={[
                          "mr-2 inline-block size-1.5 rounded-full",
                          subActive ? "bg-primary" : "bg-muted-foreground/60",
                        ].join(" ")}
                      />
                      <span className="truncate">{sub.title}</span>
                    </Row>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </div>
    </div>
  );
}

export { AppSidebar };
export default AppSidebar;
