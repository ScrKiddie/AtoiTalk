import { Loader2, MailPlus, MessageSquare, Search } from "lucide-react";

import { InfiniteUserList } from "@/components/infinite-user-list";
import Logo from "@/components/logo.tsx";
import { BlockUserDialog } from "@/components/modals/block-user-dialog";

import { useTheme } from "@/components/theme-provider.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button.tsx";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useChats, useSearchUsers } from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { User } from "@/types";
import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicGroupSearchDialog } from "./modals/public-group-search-dialog";

export function NavHeader() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [publicSearchOpen, setPublicSearchOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: chatsData } = useChats();
  const [creatingChatUserId, setCreatingChatUserId] = useState<string | null>(null);

  const trimmedSearch = debouncedSearch.trim();
  const {
    data: searchResults,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    refetch,
  } = useSearchUsers(trimmedSearch, {
    enabled: !!trimmedSearch && trimmedSearch.length >= 3,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSendMessage = async (user: User) => {
    setCreatingChatUserId(user.id);
    try {
      const existingChat = chatsData?.pages
        .flatMap((page) => page.data)
        .find((chat) => chat.type === "private" && chat.other_user_id === user.id);

      if (existingChat) {
        setOpen(false);
        setSearch("");
        navigate(`/chat/${existingChat.id}`);
        return;
      }

      setOpen(false);
      setSearch("");
      navigate(`/chat/u/${user.id}`);
    } catch {
      toast.error("Failed to start chat");
    } finally {
      setCreatingChatUserId(null);
    }
  };

  const handleDialogChange = (val: boolean) => {
    if (!val) {
      setSearch("");
      setDebouncedSearch("");
    }
    setOpen(val);
  };

  const users = (searchResults?.pages.flatMap((page) => page.data) || []).filter(
    (u) => !u.is_blocked_by_me
  );

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:!p-0">
            <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Logo mode={theme} width={40} height={40} />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium ">AtoiTalk</span>
              <span className="truncate text-xs">Enjoy Your Talk</span>
            </div>
            <Dialog open={open} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button
                  className="size-8 group-data-[collapsible=icon]:hidden"
                  variant="outline"
                  size="icon"
                >
                  <MailPlus className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] h-[600px] flex flex-col">
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-2 relative flex flex-col min-h-0">
                  <div className="grid gap-4 h-full grid-rows-[auto_1fr] min-w-0 w-full overflow-hidden">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <InfiniteUserList
                      users={users}
                      isLoading={isSearching}
                      isError={!!isError}
                      hasNextPage={!!hasNextPage}
                      isFetchingNextPage={!!isFetchingNextPage}
                      fetchNextPage={() => fetchNextPage()}
                      refetch={() => refetch()}
                      emptyMessage={debouncedSearch ? "No users found." : "Type to search users."}
                      loadingHeight="h-11"
                      showBorder={false}
                      resetKey={debouncedSearch}
                      skeletonButtonCount={1}
                      renderActions={(user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors group gap-2 min-w-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                            <Avatar>
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-left min-w-0 w-full">
                              <span className="text-sm font-medium truncate">{user.full_name}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                @{user.username}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-8"
                              onClick={() => handleSendMessage(user)}
                              title="Send Message"
                              disabled={creatingChatUserId === user.id}
                            >
                              {creatingChatUserId === user.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <MessageSquare className="size-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              className="size-8 group-data-[collapsible=icon]:hidden"
              variant="outline"
              size="icon"
              onClick={() => setPublicSearchOpen(true)}
              title="Groups"
            >
              <Globe className="size-4" />
            </Button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
      <BlockUserDialog
        open={!!userToBlock}
        onOpenChange={(val) => {
          if (!val) setUserToBlock(null);
        }}
        userId={userToBlock}
      />
      <PublicGroupSearchDialog isOpen={publicSearchOpen} onClose={setPublicSearchOpen} />
    </>
  );
}
