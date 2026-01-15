import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button.tsx";
import { ChatListItem, EditMessage, Media, Message, User } from "@/types";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCheck,
  RefreshCcw,
  Reply,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import * as React from "react";
import { MessageAttachments } from "./message-attachments";
import { MessageReplyPreview } from "./message-reply-preview";

interface MessageBubbleProps {
  message: Message;
  current: User | null;
  chat: ChatListItem;
  activeMessageId: string | null;
  editMessage: EditMessage | null;
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  isLoadingMessage: boolean;
  isError: boolean;
  handleClick: (messageId: string) => void;
  setEditMessage: (editMessage: EditMessage | null) => void;
  setNewMessageText: (text: string) => void;
  setAttachmentMode: (mode: boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setReplyTo: (message: Message | null) => void;
  setMessageToDelete: (id: string | null) => void;
  setShowDeleteModal: (show: boolean) => void;
  setAttachments: (attachments: Media[]) => void;
  jumpToMessage: (id: string, originId?: string) => void;
  highlightedMessageId: string | null;
  isBusy: boolean;
}

const MessageBubble = ({
  message,
  current,
  chat,
  activeMessageId,
  editMessage,
  messageRefs,
  isLoadingMessage,
  isError,
  handleClick,
  setEditMessage,
  setNewMessageText,
  setAttachmentMode,
  textareaRef,
  setReplyTo,
  setMessageToDelete,
  setShowDeleteModal,
  setAttachments,
  jumpToMessage,
  highlightedMessageId,
  isBusy,
}: MessageBubbleProps) => {
  if (!chat || !message) return null;

  const isCurrentUser = message.sender_id === current?.id;

  const handleReply = () => {
    if (editMessage) {
      setEditMessage(null);
      setNewMessageText("");
      setAttachmentMode(false);
      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
    }
    setReplyTo(message);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleEdit = () => {
    setAttachments([]);
    setAttachmentMode(false);
    setReplyTo(null);
    setNewMessageText("");
    const editMsg: EditMessage = {
      ...message,
      attachments: message.attachments?.map((att) => ({ ...att, delete: false })) ?? [],
    };
    setEditMessage(editMsg);
    if (message.attachments && message.attachments?.length !== 0) {
      setAttachmentMode(true);
    }
    setNewMessageText(message.content || "");
    if (textareaRef.current) {
      textareaRef.current.value = message.content || "";
      textareaRef.current.focus();
    }
  };

  const senderName = isCurrentUser
    ? "You"
    : chat.type === "group"
      ? `User ${message.sender_id}`
      : chat.name;
  const senderAvatar = isCurrentUser
    ? current?.avatar
    : chat.type === "private"
      ? chat.avatar
      : undefined;

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasImages = message.attachments?.some((att) => att.mime_type.startsWith("image/"));

  return (
    <motion.div
      initial={{ opacity: 0, x: isCurrentUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} w-full`}
    >
      <div
        id={`message-${message.id}`}
        ref={(el) => {
          messageRefs.current[message.id] = el;
        }}
        className={cn(
          "group relative flex items-end max-w-[84%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[550px] min-w-0",
          hasImages && "w-full"
        )}
        onClick={() => handleClick(message.id)}
      >
        {!isCurrentUser && chat.type === "group" && (
          <Avatar className="shrink-0 w-10 h-10 self-end">
            <AvatarImage src={senderAvatar || undefined} className="object-cover w-full h-full" />
            <AvatarFallback>{senderName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}

        {isCurrentUser && (
          <div className="self-stretch shrink-0 h-12 flex h-full items-center justify-center cursor-pointer">
            <div className="flex items-center justify-center min-h-[63.200px]">
              {!isLoadingMessage &&
                !message.deleted_at &&
                (isError ? (
                  <div className="flex flex-col gap-1">
                    <Button
                      size={"icon"}
                      className={cn(
                        "size-fit p-[6px] bg-foreground border rounded-full transition-all duration-200",
                        "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
                        activeMessageId === message.id && "opacity-100 pointer-events-auto"
                      )}
                      onClick={() => {}}
                    >
                      <RefreshCcw className="text-background size-4" />
                    </Button>
                    <Button
                      size={"icon"}
                      className={cn(
                        "size-fit p-[6px] bg-foreground border rounded-full transition-all duration-200",
                        "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
                        activeMessageId === message.id && "opacity-100 pointer-events-auto"
                      )}
                      onClick={() => {}}
                    >
                      <X className="text-background size-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 right-full pr-2 flex items-center z-10 transition-all duration-200 ease-in-out",
                      "opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:delay-0",
                      activeMessageId === message.id && "opacity-100 visible"
                    )}
                  >
                    {Date.now() - new Date(message.created_at).getTime() < 15 * 60 * 1000 && (
                      <Button
                        size={"icon"}
                        disabled={isBusy}
                        className="size-fit p-[6px] bg-foreground border rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit();
                        }}
                      >
                        <SquarePen className="text-background size-4" />
                      </Button>
                    )}

                    <div className="flex flex-col gap-1 items-center">
                      <Button
                        size={"icon"}
                        disabled={isBusy}
                        className="size-fit p-[6px] bg-foreground border rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReply();
                        }}
                      >
                        <Reply className="text-background size-4" />
                      </Button>
                      <Button
                        size={"icon"}
                        disabled={isBusy}
                        className="size-fit p-[6px] bg-foreground border rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessageToDelete(message.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 className="text-background size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div
          className={cn(
            "p-[10px] rounded-md border grid gap-1.5 min-w-0 w-full overflow-hidden transition-colors duration-200",
            isCurrentUser ? "bg-foreground text-background" : "bg-background text-foreground",
            highlightedMessageId === message.id && "ring-2 ring-blue-500"
          )}
        >
          {!isCurrentUser && chat.type === "group" && (
            <p className="text-sm font-[500] line-clamp-1">{senderName}</p>
          )}
          {message.deleted_at ? (
            <p
              className={`text-sm italic flex items-center gap-1 ${isCurrentUser ? "text-background/70" : "text-muted-foreground/80"}`}
            >
              <Ban className="size-3.5 shrink-0" />
              Pesan sudah dihapus
            </p>
          ) : (
            <>
              <MessageReplyPreview
                message={message}
                chat={chat}
                current={current}
                isCurrentUser={isCurrentUser}
                jumpToMessage={jumpToMessage}
              />
              <MessageAttachments message={message} isCurrentUser={isCurrentUser} />
              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-all">
                  {message.content.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
                    if (part.match(/(https?:\/\/[^\s]+)/g)) {
                      return (
                        <a
                          key={index}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:opacity-80 text-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {part}
                        </a>
                      );
                    }
                    return part;
                  })}
                </p>
              )}
            </>
          )}
          <div className="flex justify-end w-full items-center gap-1">
            {message.edited_at && !message.deleted_at && (
              <span
                className={`text-xs ${isCurrentUser ? "text-background/90" : "text-muted-foreground/90"}`}
              >
                edited
              </span>
            )}
            <p
              className={`text-xs line text-right ${isCurrentUser ? "text-background" : "text-primary"}`}
            >
              {formattedTime}
            </p>
            {isLoadingMessage ? (
              <Spinner className="size-4" />
            ) : isError ? (
              <AlertCircle className="size-4 text-destructive" />
            ) : null}
            {!isLoadingMessage &&
              !isError &&
              isCurrentUser &&
              !message.deleted_at &&
              (chat.other_last_read_at &&
              message.created_at &&
              new Date(chat.other_last_read_at) >= new Date(message.created_at) ? (
                <CheckCheck className="size-3 text-blue-500" />
              ) : (
                <Check
                  className={`size-3 ${isCurrentUser ? "text-background/70" : "text-muted-foreground"}`}
                />
              ))}
          </div>
        </div>

        {!isCurrentUser && !message.deleted_at && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 left-full pl-2 flex items-center gap-1 z-10 transition-all duration-200 ease-in-out",
              "opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:delay-0",
              activeMessageId === message.id && "opacity-100 visible"
            )}
          >
            <Button
              size={"icon"}
              disabled={isBusy}
              className="size-fit p-[6px] bg-background border rounded-full transition-all duration-200 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                if (editMessage) {
                  setEditMessage(null);
                  setNewMessageText("");
                  setAttachmentMode(false);
                  if (textareaRef.current) {
                    textareaRef.current.value = "";
                  }
                }
                setReplyTo(message);
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
            >
              <Reply className="text-foreground size-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
