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

  if (!lastMessage) return <span className="truncate">No messages</span>;

  const senderNameFromProfile = sender?.full_name;
  const isSenderDeleted = !senderId || (!sender && !lastMessage.sender_name);
  const finalSenderName = isSenderDeleted
    ? "Deleted Account"
    : senderNameFromProfile || lastMessage.sender_name || "Unknown User";

  const targetNameFromProfile = targetUser?.full_name;
  const isTargetDeleted = !targetId || (!targetUser && !actionData?.target_name);
  const finalTargetName = isTargetDeleted
    ? "Deleted Account"
    : targetNameFromProfile || actionData?.target_name || "User";

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
      <span className="flex items-center min-w-0 truncate">
        {chat.type === "group" && (
          <>
            <span className="text-foreground truncate max-w-[80px] shrink-0">
              {lastMessage.sender_id === currentUser?.id ? "You" : finalSenderName}
            </span>
            <span className="text-foreground mr-0.5">: </span>
          </>
        )}
        <span className="flex items-center italic opacity-70 truncate min-w-0">
          <Ban className="size-3 shrink-0 mr-1" />
          <span className="truncate">Pesan sudah dihapus</span>
        </span>
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

  const isFileType = ["file", "image", "video", "audio"].includes(lastMessage.type);

  if ((lastMessage.attachments && lastMessage.attachments.length > 0) || isFileType) {
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
};
