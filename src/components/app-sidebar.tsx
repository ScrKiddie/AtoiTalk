import { ChatSearchInput } from "@/components/chat-search-input.tsx";
import { NavChat } from "@/components/nav-chat.tsx";
import { NavFooter } from "@/components/nav-footer.tsx";
import { NavHeader } from "@/components/nav-header.tsx";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { useChats } from "@/hooks/queries";
import { useChatListScroll } from "@/hooks/use-chat-list-scroll";
import { useAuthStore, useChatStore, useUIStore } from "@/store";
import * as React from "react";
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const { searchQuery, setSearchQuery } = useChatStore();

  const { user: currentUser } = useAuthStore();
  const setGlobalLoading = useUIStore((state) => state.setGlobalLoading);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, isError, refetch } =
    useChats({ query: searchQuery });

  const chats = data?.pages.flatMap((page) => page.data) || [];

  const { scrollRef, handleScroll } = useChatListScroll({
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage: isFetchingNextPage ?? false,
    isError: isError ?? false,
    fetchNextPage,
  });

  const debouncedSetSearch = React.useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    const debounced = (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setSearchQuery(value), 500);
    };
    debounced.cancel = () => clearTimeout(timeoutId);
    return debounced;
  }, []);

  React.useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

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
      <SidebarContent className="bg-background" onScroll={handleScroll} scrollRef={scrollRef}>
        <ChatSearchInput onSearch={debouncedSetSearch} initialValue={searchQuery} />
        <NavChat
          chats={chats}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          isError={isError}
          refetch={refetch}
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
