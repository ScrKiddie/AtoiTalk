import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import * as FileUpload from "@/components/ui/file-upload";
import { toast } from "@/lib/toast";
import { ChatListItem, EditMessage, EditMessageRequest, Media, Message, User } from "@/types";
import { File as FileIcon, Loader2, SendHorizonal, Shredder, Smile, Unlock, X } from "lucide-react";

import AttachmentCard from "@/components/attachment-card";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useWebSocketContext } from "@/context/websocket-context";
import { useUserById } from "@/hooks/queries";
import { useRefreshMedia } from "@/hooks/use-refresh-media";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { FloatingChatButtons } from "./floating-chat-buttons";

interface ChatFooterProps {
  replyTo: Message | null;
  editMessage: EditMessage | null;
  attachmentMode: boolean;
  attachments: Media[];
  current: User | null;
  chat?: ChatListItem;
  newMessageText: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setReplyTo: (replyTo: Message | null) => void;
  setEditMessage: (editMessage: EditMessage | null) => void;
  setAttachmentMode: (mode: boolean) => void;
  setAttachments: React.Dispatch<React.SetStateAction<Media[]>>;
  setNewMessageText: (text: string) => void;
  onSendMessage: (text: string, attachments: Media[]) => void;
  isSending?: boolean;
  showScrollButton: boolean;
  scrollToBottom: () => void;
  partnerProfile?: User | null;
  showReturnButton?: boolean;
  onReturnJump?: () => void;
  onEditMessage: (params: {
    messageId: string;
    chatId: string;
    data: EditMessageRequest;
    optimisticAttachments?: Media[];
  }) => Promise<unknown>;
  isEditing: boolean;
  uploadingFiles: File[];
  setUploadingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploadingKeysRef: React.MutableRefObject<Set<string>>;
  uploadMedia: (variables: { file: File; signal?: AbortSignal }) => Promise<Media>;
  isUploading: boolean;
  isLoading?: boolean;
}

const ChatFooter = ({
  replyTo,
  editMessage,
  attachmentMode,
  attachments,
  newMessageText,
  textareaRef,
  setReplyTo,
  setEditMessage,
  setAttachmentMode,
  setAttachments,

  setNewMessageText,
  onSendMessage,
  isSending,
  showScrollButton,
  scrollToBottom,
  partnerProfile,
  chat,
  showReturnButton,
  onReturnJump,
  current,
  onEditMessage,
  isEditing,
  uploadingFiles,
  setUploadingFiles,
  uploadingKeysRef,
  uploadMedia,
  isUploading,
  isLoading = false,
}: ChatFooterProps) => {
  const [isEmojiOpen, setIsEmojiOpen] = React.useState(false);
  const fileListRef = React.useRef<HTMLDivElement>(null);

  const isBlockedByMe = partnerProfile?.is_blocked_by_me;
  const isBlockedByOther = partnerProfile?.is_blocked_by_other;
  const isDeleted = chat?.type === "private" && chat?.other_user_is_deleted;

  const { sendTyping } = useWebSocketContext();
  const { mutateAsync: refreshMedia } = useRefreshMedia(chat?.id ?? "");

  const {
    data: replySender,
    isError: isReplySenderError,
    isLoading: isReplySenderLoading,
  } = useUserById(replyTo?.sender_id ?? null);

  const isReplyProfileMissing = !isReplySenderLoading && (!replySender || isReplySenderError);
  const replySenderNameFromProfile = replySender?.full_name;

  const effectiveReplySenderName = isReplyProfileMissing
    ? "Deleted Account"
    : replySenderNameFromProfile || replyTo?.sender_name || "Unknown User";

  const isReplySenderDeleted =
    effectiveReplySenderName === "Deleted Account" ||
    effectiveReplySenderName === "Deleted User" ||
    (!!replySender && !replySenderNameFromProfile) ||
    isReplyProfileMissing;

  const finalReplySenderName = isReplySenderDeleted ? "Deleted Account" : effectiveReplySenderName;

  const handleRefreshMedia = async (mediaId: string) => {
    if (!editMessage?.id) return;
    try {
      const { newUrl } = await refreshMedia({ mediaId, messageId: editMessage.id });

      setEditMessage({
        ...editMessage,
        attachments:
          editMessage.attachments?.map((att) =>
            att.id === mediaId ? { ...att, url: newUrl } : att
          ) ?? null,
      });
    } catch (error) {
      console.error("Failed to refresh media in edit mode", error);
    }
  };

  const lastTypingRef = React.useRef(0);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const [minCancelTimePassed, setMinCancelTimePassed] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelUploads = () => {
    setIsCancelling(true);
    setMinCancelTimePassed(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setUploadingFiles([]);
    uploadingKeysRef.current.clear();

    setTimeout(() => {
      setMinCancelTimePassed(true);
    }, 1000);
  };

  React.useEffect(() => {
    if (isCancelling && minCancelTimePassed && !isUploading) {
      setIsCancelling(false);
    }
  }, [isCancelling, minCancelTimePassed, isUploading]);

  const handleTyping = () => {
    if (!chat?.id) return;

    const now = Date.now();

    if (now - lastTypingRef.current > 3000) {
      sendTyping(chat.id);
      lastTypingRef.current = now;
    }
  };

  React.useEffect(() => {
    if (fileListRef.current) {
      fileListRef.current.scrollTop = fileListRef.current.scrollHeight;
    }
  }, [attachments, editMessage?.attachments, uploadingFiles]);

  if (isDeleted) {
    return (
      <footer className="relative mx-auto p-2 gap-2 w-full flex flex-col items-start bg-background border-t">
        <FloatingChatButtons
          showReturnButton={showReturnButton}
          onReturnJump={onReturnJump}
          showScrollButton={showScrollButton}
          scrollToBottom={scrollToBottom}
        />
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-2 rounded-xl border shadow-sm w-full min-h-[58px]">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <p className="text-sm text-muted-foreground font-medium">
              This account has been deleted.
            </p>
            <p className="text-[10px] text-muted-foreground">
              You cannot send messages to this user.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  if (isBlockedByMe) {
    return (
      <footer className="relative mx-auto p-2 gap-2 w-full flex flex-col items-start bg-background border-t">
        <FloatingChatButtons
          showReturnButton={showReturnButton}
          onReturnJump={onReturnJump}
          showScrollButton={showScrollButton}
          scrollToBottom={scrollToBottom}
        />
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-2 rounded-xl border shadow-sm w-full min-h-[58px]">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <p className="text-sm text-muted-foreground font-medium">You have blocked this user.</p>
            <p className="text-[10px] text-muted-foreground flex items-center">
              Tap the <Unlock className="inline-block w-3 h-3 mx-1" /> icon in the header to
              unblock.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  if (isBlockedByOther) {
    return (
      <footer className="relative mx-auto p-2 gap-2 w-full flex flex-col items-start bg-background border-t">
        <FloatingChatButtons
          showReturnButton={showReturnButton}
          onReturnJump={onReturnJump}
          showScrollButton={showScrollButton}
          scrollToBottom={scrollToBottom}
        />
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-2 rounded-xl border shadow-sm w-full min-h-[58px]">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <p className="text-sm text-muted-foreground font-medium">
              You have been blocked by this user.
            </p>
            <p className="text-[10px] text-muted-foreground">You cannot send messages to them.</p>
          </div>
        </div>
      </footer>
    );
  }

  const handleFilesChange = async (newFiles: File[]) => {
    const addedFiles = newFiles.filter(
      (nf) =>
        !uploadingFiles.some(
          (uf) => uf.name === nf.name && uf.size === nf.size && uf.lastModified === nf.lastModified
        )
    );

    const notUploadedFiles = addedFiles.filter(
      (nf) => !attachments.some((att) => att.original_name === nf.name && att.file_size === nf.size)
    );

    const trulyNewFiles = notUploadedFiles.filter((nf) => {
      const key = `${nf.name}-${nf.size}-${nf.lastModified}`;
      return !uploadingKeysRef.current.has(key);
    });

    const validFiles: File[] = [];
    const MAX_SIZE = 20 * 1024 * 1024;

    for (const file of trulyNewFiles) {
      if (file.size > MAX_SIZE) {
        toast.error("File exceeds 20MB limit", { id: "file-size-error" });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    validFiles.forEach((f) => {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      uploadingKeysRef.current.add(key);
    });

    setUploadingFiles((prev) => {
      const uniqueNew = validFiles.filter(
        (nf) =>
          !prev.some(
            (uf) =>
              uf.name === nf.name && uf.size === nf.size && uf.lastModified === nf.lastModified
          )
      );
      return [...prev, ...uniqueNew];
    });

    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    const signal = abortControllerRef.current.signal;

    for (const file of validFiles) {
      if (signal.aborted) break;

      let retryCount = 0;
      const MAX_RETRIES = 3;
      let success = false;

      while (!success && retryCount < MAX_RETRIES) {
        try {
          const media = await uploadMedia({ file, signal });

          if (signal.aborted) break;

          setAttachments((prev) => [...prev, media]);

          setUploadingFiles((prev) =>
            prev.filter(
              (f) =>
                f !== file &&
                !(
                  f.name === file.name &&
                  f.size === file.size &&
                  f.lastModified === file.lastModified
                )
            )
          );

          const key = `${file.name}-${file.size}-${file.lastModified}`;
          uploadingKeysRef.current.delete(key);
          success = true;

          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("File upload error:", error);

          if (
            typeof error === "object" &&
            error !== null &&
            "response" in error &&
            (error as { response: { status: number } }).response?.status === 429
          ) {
            retryCount++;
            toast.error(`Rate limit hit. Pausing for 5s... (Retry ${retryCount}/${MAX_RETRIES})`, {
              id: "rate-limit-wait",
            });
            await new Promise((resolve) => setTimeout(resolve, 5000));

            if (signal.aborted) break;

            continue;
          }

          setUploadingFiles((prev) =>
            prev.filter(
              (f) =>
                f !== file &&
                !(
                  f.name === file.name &&
                  f.size === file.size &&
                  f.lastModified === file.lastModified
                )
            )
          );

          const key = `${file.name}-${file.size}-${file.lastModified}`;
          uploadingKeysRef.current.delete(key);
          break;
        }
      }
    }
  };

  const handleSendMessage = async () => {
    if (editMessage) {
      if (!chat) return;

      const keptAttachments = editMessage.attachments?.filter((item) => !item.delete) || [];
      const finalAttachments = [...keptAttachments, ...attachments];
      const attachmentIds = finalAttachments.map((a) => a.id);

      const isContentSame = newMessageText.trim() === (editMessage.content || "").trim();
      const isAttachmentsSame =
        attachments.length === 0 && (editMessage.attachments || []).every((att) => !att.delete);

      if (isContentSame && isAttachmentsSame) {
        setEditMessage(null);
        setNewMessageText("");
        setAttachments([]);
        setAttachmentMode(false);
        return;
      }

      if (attachmentIds.length === 0 && newMessageText.trim() === "") {
        return;
      }

      try {
        await onEditMessage({
          messageId: editMessage.id,
          chatId: chat.id,
          data: {
            content: newMessageText,
            attachment_ids: attachmentIds,
          },
          optimisticAttachments: finalAttachments,
        });
        setEditMessage(null);
        setNewMessageText("");
        setAttachments([]);
        setAttachmentMode(false);
      } catch (error) {
        console.error("Failed to edit message", error);
      }
      return;
    }

    if (attachments.length === 0 && newMessageText.trim() === "") {
      return;
    }

    if (isUploading) {
      return;
    }

    onSendMessage(newMessageText, attachments);
  };

  return (
    <footer className="relative mx-auto p-2 gap-2 w-full flex flex-col items-start bg-background border-t">
      <FloatingChatButtons
        showReturnButton={showReturnButton}
        onReturnJump={onReturnJump}
        showScrollButton={showScrollButton}
        scrollToBottom={scrollToBottom}
      />
      <div className="flex flex-col w-full gap-2">
        <AnimatePresence>
          {(replyTo || editMessage) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="flex justify-between items-center w-full gap-2 overflow-hidden"
            >
              <Card className="w-full flex-1 rounded-md gap-1 p-2 shadow-none bg-muted/50 border-l-4 border-l-primary">
                <div className="flex justify-between items-center w-full gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-sm font-semibold text-primary shrink-0">
                      {replyTo ? "Replying to" : "Editing Message"}
                    </p>
                    {replyTo && (
                      <p className="text-sm font-semibold text-primary truncate">
                        {replyTo.sender_id === current?.id ? "You" : finalReplySenderName}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isUploading || isSending || isEditing || isLoading}
                    className="size-6 hover:bg-background/50 rounded-full"
                    onClick={() => {
                      if (replyTo) {
                        setReplyTo(null);
                      } else if (editMessage) {
                        setNewMessageText("");
                        setEditMessage(null);
                        setAttachmentMode(false);
                        setAttachments([]);
                        if (textareaRef.current) {
                          textareaRef.current.value = "";
                          textareaRef.current.focus();
                        }
                      }
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="flex flex-col min-w-0">
                  {(() => {
                    const content = replyTo?.content ?? editMessage?.content ?? "";

                    if (content) {
                      return content
                        .split("\n")
                        .slice(0, 2)
                        .map((line, i) => (
                          <p key={i} className="text-sm text-muted-foreground truncate">
                            {line}
                          </p>
                        ));
                    }

                    return (
                      <span className="inline-flex items-center gap-1 align-text-bottom text-sm text-muted-foreground">
                        <FileIcon className="size-3.5 shrink-0" /> File
                      </span>
                    );
                  })()}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {attachmentMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="flex justify-between items-center w-full gap-2 overflow-hidden"
            >
              <FileUpload.Root
                className={"w-full"}
                value={uploadingFiles}
                onValueChange={handleFilesChange}
                multiple={true}
              >
                <FileUpload.Dropzone
                  className={
                    isUploading || isSending || isEditing || isCancelling
                      ? "pointer-events-none opacity-80"
                      : ""
                  }
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center rounded-full border">
                      <FileUpload.Trigger
                        asChild
                        asChild
                        disabled={
                          isUploading || isSending || isEditing || isCancelling || isLoading
                        }
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={
                            isUploading || isSending || isEditing || isCancelling || isLoading
                          }
                        >
                          {isUploading || isCancelling ? (
                            <Loader2 className="size-6 text-muted-foreground animate-spin" />
                          ) : (
                            <FileIcon className="size-6 text-muted-foreground" />
                          )}
                        </Button>
                      </FileUpload.Trigger>
                    </div>
                    {isCancelling ? (
                      <>
                        <p className="font-medium text-sm">Cancelling your uploads...</p>
                        <p className="text-muted-foreground text-xs">Please wait a moment</p>
                      </>
                    ) : isUploading && uploadingFiles.length > 0 ? (
                      <>
                        <p className="font-medium text-sm">Uploading your file....</p>
                        <p className="text-muted-foreground text-xs">
                          Please wait a moment <span className="text-foreground">or</span>{" "}
                          <span
                            className="text-red-500 cursor-pointer hover:text-red-400 transition-colors font-medium pointer-events-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelUploads();
                            }}
                          >
                            cancel
                          </span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-sm">Drag & drop files here</p>
                        <p className="text-muted-foreground text-xs">Or click to browse</p>
                      </>
                    )}
                  </div>
                </FileUpload.Dropzone>
                <AnimatePresence>
                  {(attachments.length > 0 ||
                    editMessage?.attachments?.some((item) => !item.delete)) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        ref={fileListRef}
                        className={`max-h-[7.8rem] gap-[8px] flex-col flex ${isUploading || isSending || isEditing ? "overflow-hidden opacity-50 pointer-events-none" : "overflow-auto"}`}
                      >
                        <AnimatePresence initial={false}>
                          {editMessage &&
                            editMessage.attachments &&
                            editMessage.attachments.map(
                              (item, index) =>
                                item &&
                                !item.delete && (
                                  <motion.div
                                    key={`edit-${index}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <AttachmentCard
                                      file={item}
                                      isSender={false}
                                      isEditMode={true}
                                      disabled={isUploading || isSending || isEditing}
                                      onRefresh={handleRefreshMedia}
                                      onClick={() => {
                                        const updatedAttachments =
                                          editMessage.attachments?.map((att, idx) => {
                                            if (idx === index) {
                                              return { ...att, delete: true };
                                            }
                                            return att;
                                          }) ?? editMessage?.attachments;

                                        setEditMessage({
                                          ...editMessage,
                                          attachments: updatedAttachments,
                                        });
                                      }}
                                    />
                                  </motion.div>
                                )
                            )}

                          {attachments.map((media) => (
                            <motion.div
                              key={`att-${media.id}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                            >
                              <AttachmentCard
                                file={media}
                                isSender={false}
                                isEditMode={true}
                                disabled={isUploading || isSending || isEditing}
                                onRefresh={handleRefreshMedia}
                                onClick={() => {
                                  setAttachments(attachments.filter((a) => a.id !== media.id));
                                }}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </FileUpload.Root>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-xl border shadow-sm w-full">
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              disabled={isUploading || isSending || isEditing || isLoading}
              className={`size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted ${attachmentMode ? "bg-muted text-foreground" : ""}`}
              onClick={() => {
                setAttachmentMode(!attachmentMode);
                if (attachmentMode) {
                  if (!isUploading && !isSending) {
                    setAttachments([]);
                    setUploadingFiles([]);
                    if (editMessage) {
                      const updatedEditMessage = {
                        ...editMessage,
                        attachments:
                          editMessage.attachments?.map((att) => ({
                            ...att,
                            delete: true,
                          })) ?? [],
                      };
                      setEditMessage(updatedEditMessage);
                    }
                  }
                }
              }}
            >
              {attachmentMode ? <Shredder className="size-5" /> : <FileIcon className="size-5" />}
            </Button>

            <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isUploading || isSending || isEditing || isLoading}
                  className={`size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted ${isEmojiOpen ? "bg-muted text-foreground" : ""}`}
                >
                  <Smile className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-fit p-0" side="top" align="start">
                <EmojiPicker
                  className="h-[342px]"
                  onEmojiSelect={(emoji) => {
                    const emojiChar = emoji.emoji;
                    if (textareaRef.current) {
                      const start = textareaRef.current.selectionStart;
                      const end = textareaRef.current.selectionEnd;
                      const text = textareaRef.current.value;
                      const newText = text.substring(0, start) + emojiChar + text.substring(end);

                      textareaRef.current.value = newText;
                      setNewMessageText(newText);

                      const newCursorPos = start + emojiChar.length;
                      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                      textareaRef.current.focus();
                    } else {
                      setNewMessageText((newMessageText || "") + emojiChar);
                    }
                  }}
                >
                  <EmojiPickerSearch />
                  <EmojiPickerContent />
                  <EmojiPickerFooter />
                </EmojiPicker>
              </PopoverContent>
            </Popover>
          </div>

          <Textarea
            disabled={
              isUploading || isSending || isEditing || uploadingFiles.length > 0 || isLoading
            }
            className="min-h-[40px] max-h-[120px] pb-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 shadow-none flex-1"
            placeholder={
              isLoading
                ? "Loading chat..."
                : isUploading || uploadingFiles.length > 0
                  ? "Uploading files..."
                  : isSending
                    ? "Sending..."
                    : isEditing
                      ? "Editing..."
                      : "Type a message..."
            }
            value={newMessageText}
            ref={textareaRef}
            onChange={(e) => {
              setNewMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={1}
          />

          <div>
            <Button
              size="icon"
              disabled={
                isUploading ||
                isSending ||
                isEditing ||
                (attachments.length === 0 &&
                  !(editMessage?.attachments?.some((a) => !a.delete) ?? false) &&
                  newMessageText.trim() === "") ||
                uploadingFiles.length > 0 ||
                isLoading
              }
              className="size-9 rounded-full shrink-0"
              onClick={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              {isUploading || isSending || isEditing || uploadingFiles.length > 0 ? (
                <Loader2 className="size-5 ml-0.5 animate-spin" />
              ) : (
                <SendHorizonal className="size-5 ml-0.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ChatFooter;
