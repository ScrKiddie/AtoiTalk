import Logo from "@/components/logo";
import { NavFooter } from "@/components/nav-footer";
import { useTheme } from "@/components/theme-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store";
import { Flag, LayoutDashboard, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function AdminSidebar() {
  const location = useLocation();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Groups",
      url: "/admin/groups",
      icon: UsersRound,
    },
    {
      title: "Reports",
      url: "/admin/reports",
      icon: Flag,
    },
  ];

  return (
    <Sidebar className="bg-background" collapsible="icon">
      <SidebarHeader className="border-b bg-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:!p-0">
              <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Logo mode={theme} width={40} height={40} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">AtoiTalk</span>
                <span className="truncate text-xs">Enjoy Your Talk</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className="gap-3 px-3 [&>svg]:!size-5 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!px-0"
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span className="text-sm group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-background">
        {user && (
          <NavFooter
            current={user}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            mode="admin"
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
