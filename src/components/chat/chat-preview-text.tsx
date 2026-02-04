import { getSystemMessageText } from "@/lib/system-message-utils";
import { ChatListItem, User } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, File } from "lucide-react";

interface ChatPreviewTextProps {
  chat: ChatListItem;
  currentUser: User | null;
}

interface ActionData {
  target_id?: string;
  target_name?: string;
  actor_name?: string;
}

export const ChatPreviewText = ({ chat, currentUser }: ChatPreviewTextProps) => {
  const lastMessage = chat.last_message;

  const senderId = lastMessage?.sender_id ?? null;
  const actionData = lastMessage?.action_data as ActionData | undefined;
  const targetId = actionData?.target_id ?? null;

  const queryClient = useQueryClient();
  const senderCache = senderId ? queryClient.getQueryData<User>(["user", senderId]) : null;
  const targetCache = targetId ? queryClient.getQueryData<User>(["user", targetId]) : null;

  const sender = senderCache;
  const targetUser = targetCache;
  const isLoading = false;
  const isTargetLoading = false;
  const isError = false;
  const isTargetError = false;

  if (!lastMessage) return <span className="truncate">No messages</span>;

  const isProfileMissing = !isLoading && (!sender || isError);
  const senderNameFromProfile = sender?.full_name;

  const effectiveSenderName = isProfileMissing
    ? "Deleted Account"
    : senderNameFromProfile || lastMessage.sender_name || "Unknown User";

  const isSenderDeleted =
    effectiveSenderName === "Deleted Account" ||
    effectiveSenderName === "Deleted User" ||
    (!!sender && !senderNameFromProfile) ||
    isProfileMissing;

  const finalSenderName = isSenderDeleted ? "Deleted Account" : effectiveSenderName;

  const isTargetProfileMissing = !isTargetLoading && (!targetUser || isTargetError);
  const targetNameFromProfile = targetUser?.full_name;

  const effectiveTargetName = isTargetProfileMissing
    ? "Deleted Account"
    : targetNameFromProfile || actionData?.target_name || "User";

  const isTargetDeleted =
    effectiveTargetName === "Deleted Account" ||
    effectiveTargetName === "Deleted User" ||
    (!!targetUser && !targetNameFromProfile) ||
    isTargetProfileMissing;

  const finalTargetName = isTargetDeleted ? "Deleted Account" : effectiveTargetName;

  if (lastMessage.type.startsWith("system_")) {
    const messageWithCorrectName = {
      ...lastMessage,
      sender_name: finalSenderName,
      action_data: {
        ...lastMessage.action_data,
        actor_name: finalSenderName,
        target_name: finalTargetName,
      },
    };

    return (
      <span className="italic opacity-80 truncate">
        {getSystemMessageText(messageWithCorrectName, currentUser?.id)}
      </span>
    );
  }

  if (lastMessage.deleted_at) {
    return (
      <span className="italic opacity-70 flex items-center gap-1 min-w-0 truncate">
        <Ban className="size-3 shrink-0" />
        <span className="truncate">Pesan sudah dihapus</span>
      </span>
    );
  }

  if (lastMessage.content) {
    return (
      <>
        {chat.type === "group" && (
          <>
            <span className="text-foreground truncate max-w-[80px] shrink-0">
              {lastMessage.sender_id === currentUser?.id ? "You" : finalSenderName}
            </span>
            <span className="text-foreground mr-0.5">: </span>
          </>
        )}
        <span className="truncate">{lastMessage.content}</span>
      </>
    );
  }

  if (lastMessage.attachments && lastMessage.attachments.length > 0) {
    return (
      <>
        {chat.type === "group" && (
          <>
            <span className="text-foreground truncate max-w-[80px] shrink-0">
              {lastMessage.sender_id === currentUser?.id ? "You" : finalSenderName}
            </span>
            <span className="text-foreground mr-0.5">: </span>
          </>
        )}
        <span className="flex items-center gap-1 truncate">
          <File className="size-3 shrink-0" />
          <span className="truncate">File</span>
        </span>
      </>
    );
  }

  return <span className="truncate">File</span>;
};
