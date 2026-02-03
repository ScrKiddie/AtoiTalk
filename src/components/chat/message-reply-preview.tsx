import { Card } from "@/components/ui/card";
import { useUserById } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { ChatListItem, Message, User } from "@/types";
import { Ban, File as FileIcon } from "lucide-react";

interface MessageReplyPreviewProps {
  message: Message;
  chat: ChatListItem | undefined;
  current: User | null;
  isCurrentUser: boolean;
  jumpToMessage: (id: string, originId?: string) => void;
}

export const MessageReplyPreview = ({
  message,
  chat,
  current,
  isCurrentUser,
  jumpToMessage,
}: MessageReplyPreviewProps) => {
  const replySenderId = message.reply_to?.sender_id ?? null;

  const {
    data: sender,
    isError: isSenderError,
    isLoading: isSenderLoading,
  } = useUserById(replySenderId);

  if (!message.reply_to) return null;

  const isProfileMissing = !isSenderLoading && (!sender || isSenderError);
  const senderNameFromProfile = sender?.full_name;

  const senderName = isProfileMissing
    ? "Deleted Account"
    : senderNameFromProfile || message.reply_to.sender_name || "Unknown User";

  const isSenderDeleted =
    senderName === "Deleted Account" ||
    senderName === "Deleted User" ||
    (!!sender && !senderNameFromProfile) ||
    isProfileMissing;

  const finalSenderName = isSenderDeleted ? "Deleted Account" : senderName;

  const isSelfReply = message.reply_to && current && message.reply_to.sender_id === current.id;

  const replyDate = message.reply_to.created_at ? new Date(message.reply_to.created_at) : null;
  const hiddenDate = chat?.hidden_at ? new Date(chat.hidden_at) : null;

  const isJumpable = Boolean(
    message.reply_to.id &&
    (!hiddenDate || (replyDate && replyDate.getTime() > hiddenDate.getTime()))
  );

  return (
    <Card
      onClick={(e) => {
        e.stopPropagation();

        if (isJumpable) {
          jumpToMessage(message.reply_to!.id, message.id);
        }
      }}
      className={cn(
        `w-full flex-1 rounded-md gap-1 p-2 shadow-none border-l-4 border-l-primary bg-muted/50 min-w-0 transition-colors`,
        isCurrentUser ? "theme-revert" : "",
        isJumpable ? "cursor-pointer hover:bg-muted/80" : "cursor-default opacity-80"
      )}
    >
      <div className={"flex justify-between items-center w-full gap-2"}>
        <p className="text-sm font-semibold text-primary truncate">
          {isSelfReply ? "You" : finalSenderName}
        </p>
      </div>
      {message.reply_to.deleted_at ? (
        <p className="text-sm text-muted-foreground/70 italic line-clamp-2 flex items-center gap-1">
          <Ban className="size-3 shrink-0" />
          Pesan sudah dihapus
        </p>
      ) : (
        <div className="flex flex-col min-w-0">
          {message.reply_to.content ? (
            message.reply_to.content
              .split("\n")
              .slice(0, 2)
              .map((line, i) => (
                <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap truncate">
                  {line}
                </p>
              ))
          ) : (
            <span className="inline-flex items-center gap-1 align-text-bottom text-sm text-muted-foreground">
              <FileIcon className="size-3.5 shrink-0" /> File
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
