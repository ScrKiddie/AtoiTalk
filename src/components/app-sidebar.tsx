import { NavChat } from "@/components/nav-chat.tsx";
import { NavFooter } from "@/components/nav-footer.tsx";
import { NavHeader } from "@/components/nav-header.tsx";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { useChats } from "@/hooks/queries";
import { useAuthStore, useUIStore } from "@/store";
import * as React from "react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);

  const { user: currentUser } = useAuthStore();
  const setGlobalLoading = useUIStore((state) => state.setGlobalLoading);
  const { data, isLoading } = useChats();
  const chats = data?.pages.flatMap((page) => page.data) || [];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [setGlobalLoading]);

  if (!currentUser) return null;

  return (
    <Sidebar className={"bg-background"} collapsible="icon" {...props}>
      <SidebarHeader className="border-b bg-background">
        <NavHeader />
      </SidebarHeader>
      <SidebarContent className="bg-background">
        <NavChat
          chats={chats}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          isLoading={isLoading}
        />
      </SidebarContent>
      <SidebarFooter className="border-t bg-background">
        {currentUser && (
          <NavFooter current={currentUser} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
