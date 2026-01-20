import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteGroup, useLeaveGroup } from "@/hooks/mutations/use-group";
import { useHideChat } from "@/hooks/mutations/use-hide-chat";
import { getInitials } from "@/lib/avatar-utils";
import { formatChatPreviewDate } from "@/lib/date-utils";
import { getSystemMessageText } from "@/lib/system-message-utils";
import { cn } from "@/lib/utils";
import { useAuthStore, useChatStore } from "@/store";
import { ChatListItem } from "@/types";
import {
  Ban,
  Check,
  CheckCheck,
  EllipsisVertical,
  File,
  Loader2,
  LogOut,
  RefreshCcw,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { BlockUserDialog } from "@/components/modals/block-user-dialog";
import { UnblockUserDialog } from "@/components/modals/unblock-user-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog.tsx";

export function NavChat({
  chats,
  activeMenu,
  setActiveMenu,
  isLoading = false,
  isFetchingNextPage,
  hasNextPage,
  isError,
  refetch,
}: {
  chats: ChatListItem[];
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  isError?: boolean;
  refetch?: () => void;
}) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.user);
  const typingUsers = useChatStore((state) => state.typingUsers);

  const match = location.pathname.match(/\/chat\/([^/]+)/);
  const activeId = match ? match[1] : null;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [deleteChatIndex, setDeleteChatIndex] = useState<number | null>(null);

  const { mutate: hideChat, isPending: isHidingChat } = useHideChat();
  const { mutate: leaveGroup, isPending: isLeavingGroup } = useLeaveGroup();
  const { mutate: deleteGroup, isPending: isDeletingGroup } = useDeleteGroup();

  const [userToBlock, setUserToBlock] = useState<string | null>(null);
  const [userToUnblock, setUserToUnblock] = useState<string | null>(null);

  const handleChatClick = (chat: ChatListItem) => {
    setActiveMenu(null);
    navigate(`/chat/${chat.id}`);
  };

  if (isLoading) {
    return <NavChatSkeleton />;
  }

  return (
    <>
      <SidebarGroup className="p-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
        <SidebarMenu className="gap-0 group-data-[collapsible=icon]:gap-2">
          {chats.length === 0 && isError && (
            <SidebarMenuItem>
              <div className="h-[calc(100vh-250px)] flex flex-col items-center justify-center gap-2 text-center group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:gap-0">
                <div className="space-y-1 group-data-[collapsible=icon]:hidden">
                  <span className="block font-semibold text-sm">Failed to load</span>
                  <p className="text-[10px] text-muted-foreground">Check your connection</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch?.()}
                  className="h-7 text-xs gap-2 mt-1 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-full"
                >
                  <RefreshCcw className="size-3.5" />
                  <span className="group-data-[collapsible=icon]:hidden">Retry</span>
                </Button>
              </div>
            </SidebarMenuItem>
          )}

          {chats.map((chat, index) => {
            const menuId = `chat-${index}`;
            const initials = getInitials(chat.name);

            return (
              <SidebarMenuItem
                key={chat.id}
                className="border-b border-sidebar-border last:border-0 group-data-[collapsible=icon]:border-none"
              >
                <div
                  className="relative w-full"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <SidebarMenuButton
                    onClick={() => handleChatClick(chat)}
                    size="lg"
                    isActive={activeId === chat.id}
                    data-state={activeMenu === menuId ? "open" : "closed"}
                    className={cn(
                      "group relative flex items-center rounded-none px-4 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:px-0",
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      activeId === chat.id
                        ? "bg-muted font-normal data-[active=true]:font-normal"
                        : "",
                      !(hoveredIndex === index || activeMenu === menuId || isMobile) && "!pr-4"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={chat.avatar || undefined} alt={chat.name} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>

                      {chat.type === "private" && (
                        <span
                          className={`absolute bottom-0 right-0 z-20 h-2.5 w-2.5 rounded-full border-2 border-background ring-0 ${chat.is_online ? "bg-green-500" : "bg-gray-400"}`}
                        />
                      )}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-3 min-w-0 group-data-[collapsible=icon]:hidden">
                      <div className="flex justify-between items-center w-full min-w-0">
                        <span className="truncate font-medium flex-1 min-w-0 mr-2">
                          {chat.name}
                        </span>
                        <div className="flex items-center gap-1 pr-1 shrink-0">
                          {chat.type !== "group" &&
                            chat.last_message?.sender_id === currentUser?.id &&
                            (chat.other_last_read_at &&
                            chat.last_message?.created_at &&
                            new Date(chat.other_last_read_at) >=
                              new Date(chat.last_message.created_at) ? (
                              <CheckCheck className="size-3.5 text-blue-500" />
                            ) : (
                              <Check className="size-3.5 text-muted-foreground" />
                            ))}
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatChatPreviewDate(chat.last_message?.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center min-h-[16px] text-xs text-muted-foreground font-normal min-w-0">
                        {typingUsers[chat.id]?.some((id) => id !== currentUser?.id) ? (
                          <span className="text-muted-foreground italic animate-pulse truncate">
                            {chat.type === "group" ? "Someone is typing..." : "Typing..."}
                          </span>
                        ) : chat.last_message ? (
                          <>
                            {chat.type === "group" &&
                              !chat.last_message.type.startsWith("system_") && (
                                <>
                                  <span className="text-foreground truncate max-w-[80px] shrink-0">
                                    {chat.last_message.sender_id === currentUser?.id
                                      ? "You"
                                      : chat.last_message.sender_name}
                                  </span>
                                  <span className="text-foreground mr-0.5">: </span>
                                </>
                              )}
                            {chat.last_message.type.startsWith("system_") ? (
                              <span className="italic opacity-80 truncate">
                                {getSystemMessageText(chat.last_message, currentUser?.id)}
                              </span>
                            ) : chat.last_message.deleted_at ? (
                              <span className="italic opacity-70 flex items-center gap-1 min-w-0 truncate">
                                <Ban className="size-3 shrink-0" />
                                <span className="truncate">Pesan sudah dihapus</span>
                              </span>
                            ) : chat.last_message.content ? (
                              <span className="truncate">{chat.last_message.content}</span>
                            ) : chat.last_message.attachments &&
                              chat.last_message.attachments.length > 0 ? (
                              <span className="flex items-center gap-1 truncate">
                                <File className="size-3 shrink-0" />
                                <span className="truncate">File</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 truncate">
                                <File className="size-3 shrink-0" />
                                <span className="truncate">File</span>
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="truncate">No messages</span>
                        )}
                      </div>
                    </div>
                    {chat.unread_count > 0 ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] leading-none text-primary-foreground ml-3 group-data-[collapsible=icon]:hidden">
                        {chat.unread_count}
                      </div>
                    ) : null}
                  </SidebarMenuButton>

                  <DropdownMenu
                    open={activeMenu === menuId}
                    onOpenChange={(open) => {
                      setActiveMenu(open ? menuId : null);
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction
                        className={cn(
                          "absolute right-2 !top-1/2 -translate-y-1/2 transition-opacity duration-200 hover:bg-transparent group-data-[collapsible=icon]:hidden",
                          hoveredIndex === index || activeMenu === menuId || isMobile
                            ? "opacity-100"
                            : "opacity-0 pointer-events-none"
                        )}
                      >
                        <EllipsisVertical />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-fit rounded-lg"
                      side={isMobile ? "left" : "right"}
                      align={"center"}
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setActiveMenu(null);
                          setTimeout(() => setDeleteChatIndex(index), 100);
                        }}
                        className={cn(
                          chat.type === "group" && chat.my_role === "owner"
                            ? "text-destructive focus:text-destructive"
                            : ""
                        )}
                      >
                        {chat.type === "group" ? (
                          chat.my_role === "owner" ? (
                            <>
                              <Trash2 className="mr-2 size-4" />
                              <span>Delete Group</span>
                            </>
                          ) : (
                            <>
                              <LogOut className="text-muted-foreground mr-2 size-4" />
                              <span>Leave Group</span>
                            </>
                          )
                        ) : (
                          <>
                            <Trash2 className="text-muted-foreground mr-2 size-4" />
                            <span>Delete Chat</span>
                          </>
                        )}
                      </DropdownMenuItem>

                      {chat.type === "private" && chat.other_user_id && (
                        <>
                          <DropdownMenuSeparator />
                          {chat.is_blocked_by_me ? (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setActiveMenu(null);
                                setTimeout(() => setUserToUnblock(chat.other_user_id!), 100);
                              }}
                            >
                              <Unlock className="text-muted-foreground mr-2 size-4" />
                              <span>Unblock User</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setActiveMenu(null);
                                setTimeout(() => setUserToBlock(chat.other_user_id!), 100);
                              }}
                            >
                              <Ban className="text-muted-foreground mr-2 size-4" />
                              <span>Block User</span>
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {isFetchingNextPage && (
          <div className="h-12 w-full flex items-center justify-center border-t border-sidebar-border group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:border-none">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isFetchingNextPage && hasNextPage && <div className="h-[0.1px] w-full" />}
      </SidebarGroup>

      <DropdownMenu></DropdownMenu>

      <ConfirmationDialog
        open={deleteChatIndex !== null}
        onOpenChange={(open) => !open && setDeleteChatIndex(null)}
        title={
          deleteChatIndex !== null
            ? chats[deleteChatIndex].type === "group"
              ? chats[deleteChatIndex].my_role === "owner"
                ? "Delete Group?"
                : "Leave Group?"
              : "Delete Chat"
            : ""
        }
        description={
          deleteChatIndex !== null
            ? chats[deleteChatIndex].type === "group"
              ? chats[deleteChatIndex].my_role === "owner"
                ? `Are you sure you want to delete "${chats[deleteChatIndex].name}"? This action cannot be undone.`
                : `Are you sure you want to leave "${chats[deleteChatIndex].name}"?`
              : "Are you sure you want to delete this chat? It will be hidden until a new message is sent."
            : ""
        }
        confirmText={
          deleteChatIndex !== null
            ? chats[deleteChatIndex].type === "group"
              ? chats[deleteChatIndex].my_role === "owner"
                ? "Delete Group"
                : "Leave"
              : "Delete"
            : "Delete"
        }
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteChatIndex !== null) {
            const chat = chats[deleteChatIndex];

            if (chat.type === "group") {
              if (chat.my_role === "owner") {
                deleteGroup(chat.id, {
                  onSuccess: () => {
                    setDeleteChatIndex(null);
                    if (chat.id === activeId) navigate("/");
                  },
                });
              } else {
                leaveGroup(chat.id, {
                  onSuccess: () => {
                    setDeleteChatIndex(null);
                    if (chat.id === activeId) navigate("/");
                  },
                });
              }
            } else {
              hideChat(chat.id, {
                onSuccess: () => {
                  setDeleteChatIndex(null);
                  if (chat.id === activeId) {
                    navigate("/");
                  }
                },
              });
            }
          }
        }}
        isLoading={isHidingChat || isLeavingGroup || isDeletingGroup}
      />

      <BlockUserDialog
        open={!!userToBlock}
        onOpenChange={(open) => !open && setUserToBlock(null)}
        userId={userToBlock || ""}
      />

      <UnblockUserDialog
        open={!!userToUnblock}
        onOpenChange={(open) => !open && setUserToUnblock(null)}
        userId={userToUnblock || ""}
      />
    </>
  );
}

function NavChatSkeleton() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {[1, 2, 3, 4, 5].map((i) => (
          <SidebarMenuItem key={i}>
            <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
              <Skeleton className="h-10 w-10 rounded-full group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8" />
              <div className="flex-1 space-y-2 group-data-[collapsible=icon]:hidden">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
