"use client";

import { useAuthStore, useChatStore } from "@/store";
import { Ban, Check, CheckCheck, EllipsisVertical, File, Trash2, Unlock } from "lucide-react";

import { useHideChat } from "@/hooks/mutations/use-hide-chat";

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
import { cn } from "@/lib/utils";

import { useState } from "react";

import { BlockUserDialog } from "@/components/modals/block-user-dialog";
import { UnblockUserDialog } from "@/components/modals/unblock-user-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/avatar-utils";
import { formatChatPreviewDate } from "@/lib/date-utils";
import { ChatListItem } from "@/types";
import { useLocation, useNavigate } from "react-router-dom";

export function NavChat({
  chats,
  activeMenu,
  setActiveMenu,
  isLoading = false,
}: {
  chats: ChatListItem[];
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  isLoading?: boolean;
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
      <SidebarGroup>
        <SidebarMenu>
          {chats.map((chat, index) => {
            const menuId = `chat-${index}`;
            const initials = getInitials(chat.name);

            return (
              <SidebarMenuItem key={chat.id}>
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
                      "group relative flex items-center",
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      activeId === chat.id
                        ? "bg-muted font-normal data-[active=true]:font-normal"
                        : "",
                      !(hoveredIndex === index || activeMenu === menuId || isMobile) && "!pr-2"
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
                    <div className="grid flex-1 text-left text-sm leading-tight ml-3 min-w-0">
                      <div className="flex justify-between items-center w-full min-w-0">
                        <span className="truncate font-medium flex-1 min-w-0 mr-2">
                          {chat.name}
                        </span>
                        <div className="flex items-center gap-1 pr-1 shrink-0">
                          {chat.last_message?.sender_id === currentUser?.id &&
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
                      <div className="flex items-center gap-1 min-h-[16px] text-xs text-muted-foreground font-normal min-w-0">
                        {typingUsers[chat.id]?.some((id) => id !== currentUser?.id) ? (
                          <span className="text-muted-foreground italic animate-pulse truncate">
                            Typing...
                          </span>
                        ) : chat.last_message ? (
                          chat.last_message.deleted_at ? (
                            <span className="italic opacity-70 flex items-center gap-1 min-w-0 truncate">
                              <Ban className="size-3 shrink-0" />
                              <span className="truncate">Pesan sudah dihapus</span>
                            </span>
                          ) : chat.last_message.content ? (
                            <span className="truncate">{chat.last_message.content}</span>
                          ) : chat.last_message.attachments &&
                            chat.last_message.attachments.length > 0 ? (
                            <>
                              <File className="size-3 shrink-0" />
                              <span className="truncate">File</span>
                            </>
                          ) : (
                            <span className="truncate">File</span>
                          )
                        ) : (
                          <span className="truncate">No messages</span>
                        )}
                      </div>
                    </div>
                    {chat.unread_count > 0 ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] leading-none text-primary-foreground ml-3">
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
                          "absolute right-2 !top-1/2 -translate-y-1/2 transition-opacity duration-200 hover:bg-transparent",
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
                      >
                        <Trash2 className="text-muted-foreground mr-2 size-4" />
                        <span>Delete Chat</span>
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
      </SidebarGroup>

      <ConfirmationDialog
        open={deleteChatIndex !== null}
        onOpenChange={(open) => !open && setDeleteChatIndex(null)}
        isLoading={isHidingChat}
        title="Delete Chat"
        description="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (deleteChatIndex !== null && chats[deleteChatIndex]) {
            const chatToDelete = chats[deleteChatIndex];
            hideChat(chatToDelete.id, {
              onSuccess: () => {
                if (activeId === chatToDelete.id) {
                  navigate("/");
                }
                setDeleteChatIndex(null);
              },
            });
          }
        }}
      />

      <BlockUserDialog
        open={!!userToBlock}
        onOpenChange={(val) => {
          if (!val) setUserToBlock(null);
        }}
        userId={userToBlock}
      />

      <UnblockUserDialog
        open={!!userToUnblock}
        onOpenChange={(val) => {
          if (!val) setUserToUnblock(null);
        }}
        userId={userToUnblock}
      />
    </>
  );
}

export function NavChatSkeleton() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {Array.from({ length: 5 }).map((_, index) => (
          <SidebarMenuItem key={index}>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="grid flex-1 gap-1 ml-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
