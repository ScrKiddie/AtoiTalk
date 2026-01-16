import { SidebarInset } from "@/components/ui/sidebar.tsx";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import Logo from "@/components/logo.tsx";
import { useEditMessage } from "@/hooks/mutations/use-edit-message";
import { useMarkAsRead } from "@/hooks/mutations/use-mark-read";
import { useUploadMedia } from "@/hooks/mutations/use-upload-media";
import {
  useChat,
  useChats,
  useCreatePrivateChat,
  useDeleteMessage,
  useMessages,
  useSendMessage,
  useUserById,
} from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { useAuthStore, useChatStore } from "@/store";
import { ChatListItem, EditMessageRequest, Media, Message, MessageType } from "@/types";

import ChatFooter from "@/components/chat/chat-footer";
import ChatHeader from "@/components/chat/chat-header";
import { ChatHeaderSkeleton } from "@/components/chat/chat-header-skeleton";
import MessageBubble from "@/components/chat/message-bubble";
import { TypingBubble } from "@/components/chat/typing-bubble";
import DeleteMessageDialog from "@/components/modals/delete-message-dialog.tsx";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useJumpToMessage } from "@/hooks/use-jump-to-message";
import { RefreshCcw } from "lucide-react";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { formatMessageDateLabel } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const ChatRoom = () => {
  const { chatId, userId } = useParams();
  const navigate = useNavigate();
  const currentChatId = chatId || null;
  const targetUserId = userId || null;
  const isVirtual = !currentChatId && !!targetUserId;

  const { user: currentUser } = useAuthStore();
  const { setActiveChatId } = useChatStore();

  const [anchorMessageId, setAnchorMessageId] = useState<string | null>(null);

  const [prevChatId, setPrevChatId] = useState<string | null>(currentChatId);
  if (currentChatId !== prevChatId) {
    setPrevChatId(currentChatId);
    setAnchorMessageId(null);
  }

  useEffect(() => {
    setActiveChatId(currentChatId);
    return () => setActiveChatId(null);
  }, [currentChatId, setActiveChatId]);

  useLayoutEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  const { data: chatsData } = useChats();
  const {
    data: singleChat,
    isLoading: isLoadingSingleChat,
    isError: isChatError,
    refetch: refetchChat,
  } = useChat(currentChatId);
  let chat =
    chatsData?.pages.flatMap((p) => p.data).find((c) => c.id === currentChatId) || singleChat;

  const {
    data: messagesData,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    isRefetching,
    refetch,
  } = useMessages(currentChatId, { anchorId: anchorMessageId ?? undefined });

  const messages = useMemo(
    () => messagesData?.pages.flatMap((p) => p.data || []).filter((m) => !!m) || [],
    [messagesData]
  );

  useEffect(() => {
    if (anchorMessageId) return;

    const isChatLoading = currentChatId ? isLoadingSingleChat : false;

    if (!isChatLoading && !chat && !isVirtual) {
      console.warn("[ChatRoom] Chat not found, redirecting to home.");
      navigate("/", { replace: true });
    }
  }, [isLoadingSingleChat, chat, isVirtual, navigate, anchorMessageId, currentChatId]);

  const derivedPartnerId =
    chat?.type === "private"
      ? (chat.other_user_id ??
        messages.find((m) => m.sender_id !== currentUser?.id)?.sender_id ??
        (chat.last_message?.sender_id !== currentUser?.id
          ? chat.last_message?.sender_id
          : undefined))
      : undefined;

  const partnerId = isVirtual ? targetUserId : derivedPartnerId;

  const {
    data: partnerProfile,
    isError: isProfileError,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useUserById(partnerId || null);

  useEffect(() => {
    if (isVirtual && targetUserId && chatsData) {
      const existingChat = chatsData.pages
        .flatMap((p) => p.data)
        .find((c) => c.type === "private" && c.other_user_id === targetUserId);
      if (existingChat) {
        navigate(`/chat/${existingChat.id}`, { replace: true });
      }
    }
  }, [isVirtual, targetUserId, chatsData, navigate]);

  if (isVirtual && partnerProfile && !chat) {
    chat = {
      id: "virtual",
      type: "private",
      name: partnerProfile.full_name,
      avatar: partnerProfile.avatar,
      unread_count: 0,
      is_pinned: false,
      last_read_at: null,
      other_last_read_at: null,
      other_user_id: partnerProfile.id,
      last_message: null,
      is_online: partnerProfile.is_online,
      is_blocked_by_me: partnerProfile.is_blocked_by_me,
      is_blocked_by_other: partnerProfile.is_blocked_by_other,
    } as ChatListItem;
  }

  const renderHeader = () => {
    if (chat) {
      return (
        <ChatHeader
          chat={chat}
          partnerId={partnerId}
          partnerProfile={partnerProfile}
          isProfileError={isProfileError}
          isProfileLoading={isProfileLoading}
          onRetryProfile={refetchProfile}
        />
      );
    }
    if (isChatError) {
      return <ChatHeaderSkeleton isError onRetry={() => refetchChat()} />;
    }
    return <ChatHeaderSkeleton />;
  };

  const displayMessages = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const groupedMessages = displayMessages.reduce(
    (acc, message) => {
      const dateLabel = formatMessageDateLabel(message.created_at);
      const lastGroup = acc[acc.length - 1];
      if (lastGroup && lastGroup.date === dateLabel) {
        lastGroup.messages.push(message);
      } else {
        acc.push({ date: dateLabel, messages: [message] });
      }
      return acc;
    },
    [] as { date: string; messages: Message[] }[]
  );

  useEffect(() => {
    if (anchorMessageId && !isMessagesLoading && !isMessagesError && groupedMessages.length === 0) {
      toast.error("Message not found or deleted");
      setAnchorMessageId(null);
    }
  }, [anchorMessageId, isMessagesLoading, isMessagesError, groupedMessages.length]);

  const [attachments, setAttachments] = useState<Media[]>([]);
  const [returnToMessageId, setReturnToMessageId] = useState<string | null>(null);
  const [attachmentMode, setAttachmentMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: createPrivateChat } = useCreatePrivateChat();
  const { mutate: deleteMessageMutation } = useDeleteMessage();
  const { mutateAsync: editMessageMutation, isPending: isEditing } = useEditMessage();
  const { mutate: markAsRead } = useMarkAsRead();

  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const uploadingKeysRef = useRef<Set<string>>(new Set());
  const { mutateAsync: uploadMediaMutation, isPending: isUploadingState } = useUploadMedia();
  const uploadMedia = useCallback(
    (variables: { file: File; signal?: AbortSignal }) => uploadMediaMutation(variables),
    [uploadMediaMutation]
  );
  const isUploading = isUploadingState || uploadingFiles.length > 0;

  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const isGlobalBusy = isSending || isEditing || isDeleteSubmitting || isUploading;

  useEffect(() => {
    if (currentChatId) {
      if (!chat || (chat.unread_count && chat.unread_count > 0)) {
        markAsRead(currentChatId);
      }
    }
  }, [currentChatId, chat, chat?.unread_count, markAsRead]);

  const handleRemoteJump = useCallback((targetId: string) => {
    setAnchorMessageId(targetId);
  }, []);

  const { jumpToMessage: internalJumpToMessage, highlightedMessageId } = useJumpToMessage({
    onRemoteJump: handleRemoteJump,
  });

  const handleJumpToMessage = useCallback(
    (targetId: string, fromMessageId?: string) => {
      if (fromMessageId) {
        setReturnToMessageId(fromMessageId);
      }
      internalJumpToMessage(targetId);
    },
    [internalJumpToMessage]
  );

  const hasJumpedRef = useRef<string | null>(null);

  const isJumpingRef = useRef(false);

  const typingUsers = useChatStore((state) => state.typingUsers);
  const isPartnerTyping = (typingUsers[chat?.id || ""] || []).length > 0;

  const { scrollRef, showScrollButton, handleScroll, scrollToBottom, isScrollReady } =
    useChatScroll({
      currentChatId,
      messages,
      isMessagesLoading,
      hasNextPage,
      hasPreviousPage,
      isFetchingNextPage,
      isFetchingPreviousPage,
      fetchNextPage,
      fetchPreviousPage,
      anchorMessageId,
      setAnchorMessageId,
      returnToMessageId,
      setReturnToMessageId,
      isPartnerTyping,
      isJumpingRef,
    });

  const prevIsFetchingNextPage = useRef(isFetchingNextPage);
  useEffect(() => {
    if (prevIsFetchingNextPage.current && !isFetchingNextPage) {
      if (isMessagesError && scrollRef.current) {
        const { scrollTop } = scrollRef.current;
        if (scrollTop < 35) {
          scrollRef.current.scrollBy({ top: 40, behavior: "smooth" });
        }
      }
    }
    prevIsFetchingNextPage.current = isFetchingNextPage;
  }, [isFetchingNextPage, scrollRef, isMessagesError]);

  const prevIsFetchingPreviousPage = useRef(isFetchingPreviousPage);
  useEffect(() => {
    if (prevIsFetchingPreviousPage.current && !isFetchingPreviousPage && anchorMessageId) {
      if (isMessagesError && scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceFromBottom < 35) {
          scrollRef.current.scrollBy({ top: -40, behavior: "smooth" });
        }
      }
    }
    prevIsFetchingPreviousPage.current = isFetchingPreviousPage;
  }, [isFetchingPreviousPage, anchorMessageId, scrollRef, isMessagesError]);

  useEffect(() => {
    if (!anchorMessageId || isMessagesLoading) return;
    if (hasJumpedRef.current === anchorMessageId) return;

    const targetId = `message-${anchorMessageId}`;

    const existingElement = document.getElementById(targetId);
    if (existingElement) {
      hasJumpedRef.current = anchorMessageId;
      isJumpingRef.current = true;
      requestAnimationFrame(() => {
        internalJumpToMessage(anchorMessageId);

        setTimeout(() => {
          isJumpingRef.current = false;
        }, 500);
      });
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const element = document.getElementById(targetId);
      if (element) {
        hasJumpedRef.current = anchorMessageId;
        isJumpingRef.current = true;
        obs.disconnect();
        requestAnimationFrame(() => {
          internalJumpToMessage(anchorMessageId);

          setTimeout(() => {
            isJumpingRef.current = false;
          }, 500);
        });
      }
    });

    if (scrollRef.current) {
      observer.observe(scrollRef.current, {
        childList: true,
        subtree: true,
      });
    }

    const timeout = setTimeout(() => {
      observer.disconnect();
    }, 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [anchorMessageId, isMessagesLoading, internalJumpToMessage, scrollRef]);

  const prevAnchorRef = useRef<string | null>(null);
  useEffect(() => {
    if (anchorMessageId !== prevAnchorRef.current) {
      hasJumpedRef.current = null;
      prevAnchorRef.current = anchorMessageId;
    }
  }, [anchorMessageId]);

  const [newMessageText, setNewMessageText] = useState("");
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<null | Message>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!replyTo) return;
    const updatedMessage = messages.find((m) => m.id === replyTo.id);

    if (updatedMessage) {
      if (updatedMessage.deleted_at) {
        setReplyTo(null);
        return;
      }

      if (
        updatedMessage.edited_at !== replyTo.edited_at ||
        updatedMessage.content !== replyTo.content ||
        (updatedMessage.attachments?.length ?? 0) !== (replyTo.attachments?.length ?? 0)
      ) {
        setReplyTo(updatedMessage);
      }
    }
  }, [messages, replyTo]);

  useEffect(() => {
    setReturnToMessageId(null);
    setNewMessageText("");
    setEditMessage(null);
    setReplyTo(null);
    setAttachments([]);
    setAttachmentMode(false);
    setActiveMessageId(null);
    setShowDeleteModal(false);
    messageRefs.current = {};
  }, [currentChatId]);

  useEffect(() => {
    if (!editMessage) return;

    const createdTime = new Date(editMessage.created_at).getTime();

    const LIMIT_MS = 15 * 60 * 1000 - 10 * 1000;
    const diff = Date.now() - createdTime;

    if (diff >= LIMIT_MS) {
      setEditMessage(null);

      toast.info("Message is too old to edit");
      return;
    }

    const remaining = LIMIT_MS - diff;
    const timer = setTimeout(() => {
      setEditMessage(null);
      setAttachments([]);
      toast.info("Message is too old to edit");
    }, remaining);

    return () => clearTimeout(timer);
  }, [editMessage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeleteModal) return;
      if (activeMessageId !== null) {
        const ref = messageRefs.current[activeMessageId];
        if (ref && !ref.contains(event.target as Node)) {
          setActiveMessageId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMessageId, showDeleteModal]);

  const handleClick = (messageId: string) => {
    setActiveMessageId(messageId);
  };

  const handleSendMessage = async (text: string, currentAttachments: Media[]) => {
    if ((!currentChatId && !isVirtual) || (!text.trim() && currentAttachments.length === 0)) return;

    const attachmentIds = currentAttachments.map((att) => att.id);

    let type: MessageType = "text";
    if (currentAttachments.length > 0) {
      const mime = currentAttachments[0].mime_type;
      if (mime.startsWith("image/")) type = "image";
      else if (mime.startsWith("video/")) type = "video";
      else if (mime.startsWith("audio/")) type = "audio";
      else type = "file";
    }

    if (text.trim() && type !== "text") {
      type = "text";
    }

    const payload = {
      content: text.trim(),
      type: type,
      reply_to_id: replyTo ? replyTo.id : undefined,
      attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
    };

    const onSuccess = () => {
      setNewMessageText("");
      setReplyTo(null);
      setAttachments([]);
      setAttachmentMode(false);

      if (anchorMessageId) {
        setAnchorMessageId(null);
      }

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    };

    if (isVirtual && targetUserId) {
      createPrivateChat(
        { target_user_id: targetUserId },
        {
          onSuccess: (newChat) => {
            sendMessage(
              { ...payload, chat_id: newChat.id },
              {
                onSuccess: () => {
                  onSuccess();
                  navigate(`/chat/${newChat.id}`, { replace: true });
                },
                onError: () => toast.error("Failed to send message"),
              }
            );
          },
        }
      );
    } else if (currentChatId) {
      sendMessage(
        { ...payload, chat_id: currentChatId },
        {
          onSuccess,
          onError: () => toast.error("Failed to send message"),
        }
      );
    }
  };

  const handleDeleteMessage = (id: string) => {
    if (!currentChatId) return;
    setIsDeleteSubmitting(true);
    deleteMessageMutation(
      { messageId: id, chatId: currentChatId },
      {
        onSuccess: () => {
          toast.success("Message deleted");
          setShowDeleteModal(false);
          setMessageToDelete(null);
          setActiveMessageId(null);
          setTimeout(() => setIsDeleteSubmitting(false), 300);
        },
        onError: () => {
          toast.error("Failed to delete message");
          setIsDeleteSubmitting(false);
        },
      }
    );
  };

  const handleEditMessage = async (params: {
    messageId: string;
    chatId: string;
    data: EditMessageRequest;
    optimisticAttachments?: Media[];
  }) => {
    return editMessageMutation({
      ...params,
      optimisticAttachments: params.optimisticAttachments ?? [],
    });
  };

  const handleReturnJump = useCallback(() => {
    if (returnToMessageId) {
      handleJumpToMessage(returnToMessageId);
      setReturnToMessageId(null);
    }
  }, [returnToMessageId, handleJumpToMessage]);

  return (
    <>
      <SidebarInset key={currentChatId ?? "empty"} className={"break-w overflow-hidden"}>
        <div className="h-[100dvh] w-full overflow-hidden flex flex-col relative">
          {renderHeader()}

          <ScrollArea
            viewportRef={scrollRef}
            onScroll={handleScroll}
            className="flex-1 px-2 overflow-hidden chat-messages-scroll"
          >
            <div className="flex flex-col flex-1 bg-none min-h-full">
              {!isMessagesError &&
              (isMessagesLoading || (anchorMessageId && groupedMessages.length === 0)) ? (
                <div className="flex-1" />
              ) : isMessagesError && groupedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 h-full gap-3 p-4">
                  <div className="text-center space-y-1">
                    <h3 className="font-semibold text-lg">Failed to load messages</h3>
                    <p className="text-sm text-muted-foreground">
                      We couldn't retrieve your chat history
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetch();
                      if (!chat) refetchChat();
                    }}
                    disabled={isRefetching}
                    className="gap-2"
                  >
                    {isRefetching ? (
                      <Spinner className="size-4" />
                    ) : (
                      <RefreshCcw className="size-4" />
                    )}
                    {isRefetching ? "Retrying..." : "Retry"}
                  </Button>
                </div>
              ) : groupedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center p-4">
                  <div className="flex items-center justify-center mb-1 text-primary">
                    <Logo width={80} height={80} />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">No Messages Yet</h2>
                  <p className="text-muted-foreground">Select a chat and start messaging</p>
                </div>
              ) : (
                <div
                  className="flex-1 p-2 flex flex-col w-full justify-end relative"
                  id="chat-container"
                >
                  <div
                    className={cn(
                      "flex flex-col gap-2 w-full transition-opacity",
                      !isScrollReady && !anchorMessageId
                        ? "opacity-0 duration-0"
                        : "opacity-100 duration-500"
                    )}
                  >
                    {hasNextPage && (
                      <div className="flex justify-center p-2 h-8 items-center">
                        {isFetchingNextPage ? <Spinner className="size-4" /> : null}
                      </div>
                    )}

                    {groupedMessages.map((group) => (
                      <div key={group.date} className="relative flex flex-col gap-2">
                        <div
                          className={cn(
                            "flex justify-center z-10 pointer-events-none",
                            group.date !== "Today" && "sticky top-2"
                          )}
                        >
                          <span className="bg-background border text-foreground rounded-full px-3 py-1 text-xs font-normal">
                            {group.date}
                          </span>
                        </div>
                        {group.messages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            current={currentUser}
                            chat={chat!}
                            activeMessageId={activeMessageId}
                            editMessage={editMessage}
                            messageRefs={messageRefs}
                            isLoadingMessage={false}
                            isError={false}
                            handleClick={handleClick}
                            setEditMessage={setEditMessage}
                            setNewMessageText={setNewMessageText}
                            setAttachmentMode={setAttachmentMode}
                            isBusy={isGlobalBusy}
                            textareaRef={textareaRef}
                            setReplyTo={setReplyTo}
                            setMessageToDelete={setMessageToDelete}
                            setShowDeleteModal={setShowDeleteModal}
                            setAttachments={setAttachments}
                            jumpToMessage={handleJumpToMessage}
                            highlightedMessageId={highlightedMessageId}
                          />
                        ))}
                      </div>
                    ))}

                    {chat && <TypingBubble chatId={chat.id} />}

                    {hasPreviousPage && (
                      <div className="flex justify-center p-2 h-8 items-center">
                        {isFetchingPreviousPage ? <Spinner className="size-4" /> : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 bg-background z-20">
            <ChatFooter
              replyTo={replyTo}
              editMessage={editMessage}
              attachmentMode={attachmentMode}
              attachments={attachments}
              current={currentUser}
              chat={chat!}
              newMessageText={newMessageText}
              textareaRef={textareaRef}
              setReplyTo={setReplyTo}
              setEditMessage={setEditMessage}
              setAttachmentMode={setAttachmentMode}
              setAttachments={setAttachments}
              setNewMessageText={setNewMessageText}
              onSendMessage={handleSendMessage}
              isSending={isSending}
              showScrollButton={
                showScrollButton && !(isMessagesError && groupedMessages.length === 0)
              }
              scrollToBottom={scrollToBottom}
              partnerProfile={partnerProfile}
              showReturnButton={
                !!returnToMessageId &&
                !isMessagesLoading &&
                !(isMessagesError && groupedMessages.length === 0)
              }
              onReturnJump={handleReturnJump}
              onEditMessage={handleEditMessage}
              isEditing={isEditing}
              uploadingFiles={uploadingFiles}
              setUploadingFiles={setUploadingFiles}
              uploadingKeysRef={uploadingKeysRef}
              uploadMedia={uploadMedia}
              isUploading={isUploading}
            />
          </div>

          <DeleteMessageDialog
            showDeleteModal={showDeleteModal}
            setShowDeleteModal={setShowDeleteModal}
            messageToDelete={messageToDelete}
            editMessage={editMessage}
            replyTo={replyTo}
            setEditMessage={setEditMessage}
            setAttachmentMode={setAttachmentMode}
            textareaRef={textareaRef}
            setReplyTo={setReplyTo}
            setMessageToDelete={setMessageToDelete}
            onConfirmDelete={() => messageToDelete && handleDeleteMessage(messageToDelete)}
            isLoading={isDeleteSubmitting}
          />
        </div>

        {((!isMessagesError &&
          (isMessagesLoading || (!!anchorMessageId && groupedMessages.length === 0))) ||
          (!isScrollReady && !anchorMessageId && groupedMessages.length > 0)) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <Spinner className="size-10" />
          </div>
        )}
      </SidebarInset>
    </>
  );
};

export default ChatRoom;
