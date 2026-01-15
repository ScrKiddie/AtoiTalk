"use client";

import { Ban, MailPlus, MessageSquare, ScrollText, Search } from "lucide-react";

import Logo from "@/components/logo.tsx";
import { BlockUserDialog } from "@/components/modals/block-user-dialog";
import { ModeToggle } from "@/components/mode-toggle.tsx";
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
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchUsers } from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { userService } from "@/services";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function NavHeader() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<string | null>(null);
  const navigate = useNavigate();

  const [initiatingUserId, setInitiatingUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const trimmedSearch = debouncedSearch.trim();
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(trimmedSearch, {
    enabled: !!trimmedSearch && trimmedSearch.length >= 3,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreatePrivateChat = async (userId: string) => {
    setInitiatingUserId(userId);
    try {
      await queryClient.fetchQuery({
        queryKey: ["user", userId],
        queryFn: ({ signal }) => userService.getUserById(userId, signal),
        staleTime: 1000 * 60,
      });

      setOpen(false);
      navigate(`/chat/u/${userId}`);
      setSearch("");
    } catch {
      toast.error("Failed to connect to user");
    } finally {
      setInitiatingUserId(null);
    }
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
            <Dialog
              open={open}
              onOpenChange={(val) => {
                if (!val && !!initiatingUserId) return;
                if (!val) {
                  setSearch("");
                  setDebouncedSearch("");
                }
                setOpen(val);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="size-8 group-data-[collapsible=icon]:hidden"
                  variant="outline"
                  size="icon"
                >
                  <MailPlus className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent
                className={`sm:max-w-[425px] h-[600px] flex flex-col ${initiatingUserId ? "[&>button]:pointer-events-none [&>button]:opacity-50" : ""}`}
                onPointerDownOutside={(e) => {
                  if (initiatingUserId) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                  if (initiatingUserId) e.preventDefault();
                }}
              >
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="personal" className="w-full flex-1 flex flex-col">
                  <TabsList
                    className={`grid w-full grid-cols-2 ${initiatingUserId ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="group">Group</TabsTrigger>
                  </TabsList>
                  <div className="flex-1 overflow-hidden mt-4 relative">
                    <TabsContent
                      value="personal"
                      className="absolute inset-0 data-[state=inactive]:hidden"
                    >
                      <div className="grid gap-4 h-full grid-rows-[auto_1fr]">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search users..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={!!initiatingUserId}
                          />
                        </div>
                        <div className="flex flex-col gap-2 overflow-y-auto">
                          {isSearching && (
                            <p className="text-center text-sm text-muted-foreground py-4">
                              Searching...
                            </p>
                          )}
                          {!isSearching && users.length === 0 && debouncedSearch && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No users found.
                            </p>
                          )}
                          {!isSearching && users.length === 0 && !debouncedSearch && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Type to search users.
                            </p>
                          )}
                          {users.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors group gap-2"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                                <Avatar>
                                  <AvatarImage src={user.avatar || undefined} />
                                  <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col text-left min-w-0 w-full">
                                  <span className="text-sm font-medium truncate">
                                    {user.full_name}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    @{user.username}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-8"
                                  onClick={() => setUserToBlock(user.id)}
                                  title="Block User"
                                  disabled={!!initiatingUserId}
                                >
                                  <Ban className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-8 relative"
                                  onClick={() => handleCreatePrivateChat(user.id)}
                                  title="Start Chat"
                                  disabled={!!initiatingUserId}
                                >
                                  {initiatingUserId === user.id ? (
                                    <Spinner className="size-4" />
                                  ) : (
                                    <MessageSquare className="size-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent
                      value="group"
                      className="absolute inset-0 data-[state=inactive]:hidden flex flex-col items-center justify-center text-center pb-15"
                    >
                      <div className="w-22 h-22 bg-muted rounded-full flex items-center justify-center mb-1">
                        <ScrollText strokeWidth={0.7} className="w-40 h-40 " />
                      </div>
                      <h3 className="font-semibold text-lg ">Coming Soon</h3>
                      <p className="text-sm text-muted-foreground max-w-[250px]">
                        Available in future update
                      </p>
                    </TabsContent>
                  </div>
                </Tabs>
              </DialogContent>
            </Dialog>
            <ModeToggle />
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
    </>
  );
}
