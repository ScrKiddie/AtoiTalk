import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { useAuthStore, useChatStore } from "@/store";
import { ChatListItem, User } from "@/types";

import { BlockUserDialog } from "@/components/modals/block-user-dialog";
import { PartnerProfileDialog } from "@/components/modals/partner-profile-dialog";
import { UnblockUserDialog } from "@/components/modals/unblock-user-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/avatar-utils";
import { formatLastSeen } from "@/lib/utils";
import { Ban, Unlock } from "lucide-react";
import { useState } from "react";

interface ChatHeaderProps {
  chat: ChatListItem;
  partnerId?: string | null;
  partnerProfile?: User | null;
  isProfileError?: boolean;
  isProfileLoading?: boolean;
  onRetryProfile?: () => void;
}

const ChatHeader = ({
  chat,
  partnerId,
  partnerProfile,
  isProfileError,
  isProfileLoading,
  onRetryProfile,
}: ChatHeaderProps) => {
  const typingUsers = useChatStore((state) => state.typingUsers);
  const { user: currentUser } = useAuthStore();

  const isTyping = typingUsers[chat.id]?.some((id) => id !== currentUser?.id);

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);

  const initials = getInitials(chat.name);

  let statusContent: React.ReactNode = "Messages";
  let statusColor = "text-muted-foreground";

  if (chat.type === "private") {
    if (isProfileLoading) {
      statusContent = <Skeleton className="h-[13px] w-24 rounded-full" />;
    } else if (isProfileError) {
      statusContent = (
        <span className="flex items-center gap-1">
          <span>Failed to load user data.</span>
          <span
            className="text-blue-500 cursor-pointer hover:text-blue-400 transition-colors font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onRetryProfile?.();
            }}
          >
            Retry
          </span>
        </span>
      );
      statusColor = "text-foreground text-xs";
    } else if (partnerProfile?.is_blocked_by_me || partnerProfile?.is_blocked_by_other) {
      statusContent = "Last seen a long time ago";
      statusColor = "text-muted-foreground";
    } else if (isTyping) {
      statusContent = "Typing...";
      statusColor = "text-muted-foreground italic font-medium animate-pulse";
    } else if (partnerProfile?.is_online) {
      statusContent = "Online";
      statusColor = "text-green-500 font-medium";
    } else if (partnerProfile?.last_seen_at) {
      statusContent = formatLastSeen(partnerProfile.last_seen_at);
    } else {
      statusContent = "Offline";
    }
  } else {
    if (isTyping) {
      statusContent = "Someone is typing...";
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
                {isProfileLoading ? (
                  <Skeleton className="size-full rounded-full" />
                ) : (
                  <>
                    <AvatarImage src={chat.avatar || undefined} className="object-cover" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                {isProfileLoading ? (
                  <Skeleton className="h-[13px] w-32 mb-1" />
                ) : (
                  <span className="truncate font-medium">{chat.name}</span>
                )}
                <div className={`truncate text-xs ${statusColor} min-h-[16px] flex items-center`}>
                  {statusContent}
                </div>
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
