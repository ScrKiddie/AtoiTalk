import Logo from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { NavFooter } from "@/components/nav-footer";
import { useTheme } from "@/components/theme-provider";

import { ScrollArea } from "@/components/ui/scroll-area";
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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store";
import { Flag, LayoutDashboard, Users, UsersRound } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function AdminLayout() {
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

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
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

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="border-b dark:border-[#212224] border-[#e4e4e7] z-50 bg-background flex h-[63px] shrink-0 items-center gap-2">
            <div className="flex gap-2 px-4 w-full justify-between items-center">
              <div className="flex items-center justify-center gap-2">
                <SidebarTrigger className="mr-1" />
              </div>
              <div className="flex items-center gap-2">
                <ModeToggle />
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="h-full w-full">
              <div className="flex flex-col min-h-[calc(100vh-64px)]">
                <div className="flex-1">
                  <Suspense fallback={null}>
                    <div className="p-6">
                      <Outlet />
                    </div>
                  </Suspense>
                </div>
                <footer className="w-full flex flex-col items-center md:items-end justify-center py-4 px-6 bg-background border-t mt-auto text-center md:text-right">
                  <p className="text-sm text-muted-foreground">
                    AtoiTalk © {new Date().getFullYear()} All Rights Reserved
                  </p>
                </footer>
              </div>
            </ScrollArea>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
