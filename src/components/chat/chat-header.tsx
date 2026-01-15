import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { useAuthStore, useChatStore } from "@/store";
import { ChatListItem, User } from "@/types";

import { BlockUserDialog } from "@/components/modals/block-user-dialog";
import { PartnerProfileDialog } from "@/components/modals/partner-profile-dialog";
import { UnblockUserDialog } from "@/components/modals/unblock-user-dialog";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/avatar-utils";
import { formatLastSeen } from "@/lib/utils";
import { Ban, Unlock } from "lucide-react";
import { useState } from "react";

interface ChatHeaderProps {
  chat: ChatListItem;
  partnerId?: string | null;
  partnerProfile?: User | null;
}

const ChatHeader = ({ chat, partnerId, partnerProfile }: ChatHeaderProps) => {
  const typingUsers = useChatStore((state) => state.typingUsers);
  const { user: currentUser } = useAuthStore();

  const isTyping = typingUsers[chat.id]?.some((id) => id !== currentUser?.id);

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);

  const initials = getInitials(chat.name);

  let statusText = "Messages";
  let statusColor = "text-muted-foreground";

  if (chat.type === "private") {
    if (partnerProfile?.is_blocked_by_me || partnerProfile?.is_blocked_by_other) {
      statusText = "Last seen a long time ago";
      statusColor = "text-muted-foreground";
    } else if (isTyping) {
      statusText = "Typing...";
      statusColor = "text-muted-foreground italic font-medium animate-pulse";
    } else if (partnerProfile?.is_online) {
      statusText = "Online";
      statusColor = "text-green-500 font-medium";
    } else if (partnerProfile?.last_seen_at) {
      statusText = formatLastSeen(partnerProfile.last_seen_at);
    } else {
      statusText = "Offline";
    }
  } else {
    if (isTyping) {
      statusText = "Someone is typing...";
      statusColor = "text-muted-foreground italic font-medium animate-pulse";
    }
  }

  return (
    <>
      <header className="outline-1 dark:outline-[#212224] outline-[#e4e4e7] z-50 bg-background flex h-[63px] shrink-0 items-center gap-2">
        <div className="flex gap-2 px-4 w-full justify-between items-center">
          <div className="flex items-center justify-center gap-2">
            <SidebarTrigger className={`mr-1`} />

            <div
              className={`flex items-center gap-2 transition-opacity ${partnerProfile ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
              onClick={() => {
                if (chat.type === "private" && partnerId && partnerProfile) {
                  setShowProfileDialog(true);
                }
              }}
            >
              <Avatar className="size-8">
                <AvatarImage src={chat.avatar || undefined} className="object-cover" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{chat.name}</span>
                <span className={`truncate text-xs ${statusColor}`}>{statusText}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {chat.type === "private" &&
              (partnerProfile?.is_blocked_by_me ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setShowUnblockDialog(true)}
                  title="Unblock User"
                >
                  <Unlock className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Unblock User</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setShowBlockDialog(true)}
                  title="Block User"
                >
                  <Ban className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Block User</span>
                </Button>
              ))}
          </div>
        </div>
      </header>

      <PartnerProfileDialog
        isOpen={showProfileDialog}
        isLoading={false}
        user={partnerProfile || null}
        onClose={setShowProfileDialog}
      />

      <BlockUserDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        userId={partnerId || null}
      />

      <UnblockUserDialog
        open={showUnblockDialog}
        onOpenChange={setShowUnblockDialog}
        userId={partnerId || null}
      />
    </>
  );
};

export default ChatHeader;
