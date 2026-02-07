import { SidebarInset } from "@/components/ui/sidebar.tsx";
import { PaginatedResponse } from "@/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useEditMessage } from "@/hooks/mutations/use-edit-message";
import { useMarkAsRead } from "@/hooks/mutations/use-mark-read";
import { useUploadMedia } from "@/hooks/mutations/use-upload-media";
import {
  useChat,
  useChats,
  useCreatePrivateChat,
  useDeleteMessage,
  useJumpToMessage as useJumpToMessageState,
  useMessages,
  useSendMessage,
  useUserById,
} from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { useAuthStore, useChatStore } from "@/store";
import { ChatListItem, EditMessageRequest, Media, Message, MessageType } from "@/types";
import { AxiosError } from "axios";

import ChatFooter from "@/components/chat/chat-footer";
import ChatHeader from "@/components/chat/chat-header";
import { ChatHeaderSkeleton } from "@/components/chat/chat-header-skeleton";
import MessageBubble from "@/components/chat/message-bubble";
import { SystemMessage, SystemMessageBadge } from "@/components/chat/system-message";
import DeleteMessageDialog from "@/components/modals/delete-message-dialog.tsx";

import { Spinner } from "@/components/ui/spinner";
import { useVirtuaChat } from "@/hooks/use-virtua-chat";
import { VList } from "virtua";

import { ChatLoading } from "@/components/chat/chat-loading";
import { ChatRetry } from "@/components/chat/chat-retry";
import { useJumpToMessage } from "@/hooks/use-jump-to-message";

import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { formatMessageDateLabel } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { RefreshCcw } from "lucide-react";

const isValidUUID = (id: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

const ChatRoom = () => {
  const queryClient = useQueryClient();
  const { chatId, userId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (chatId && !isValidUUID(chatId)) {
      navigate("/", { replace: true });
    }
  }, [chatId, navigate]);

  const isIdValid = chatId ? isValidUUID(chatId) : true;
  const currentChatId = chatId && isIdValid ? chatId : null;
  const targetUserId = userId || null;
  const isVirtual = !currentChatId && !!targetUserId;

  const { user: currentUser } = useAuthStore();
  const { setActiveChatId, activeChatId } = useChatStore();

  const [prevChatId, setPrevChatId] = useState<string | null>(currentChatId);
  const prevChatIdChanged = currentChatId !== prevChatId;
  if (prevChatIdChanged) {
    setPrevChatId(currentChatId);
  }

  const [jumpError, setJumpError] = useState(false);

  useEffect(() => {
    setActiveChatId(currentChatId);
    return () => setActiveChatId(null);
  }, [currentChatId, setActiveChatId]);

  useEffect(() => {
    const handleKicked = (e: CustomEvent<{ chatId: string }>) => {
      if (e.detail.chatId === currentChatId) {
        setActiveChatId(null);
        navigate("/", { replace: true });
      }
    };

    window.addEventListener("kicked-from-chat", handleKicked as EventListener);
    return () => {
      window.removeEventListener("kicked-from-chat", handleKicked as EventListener);
    };
  }, [currentChatId, navigate, setActiveChatId]);

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
    isFetching: isFetchingSingleChat,
    failureCount: chatFailureCount,
    error: chatError,
  } = useChat(currentChatId);

  const chatFromList = chatsData?.pages.flatMap((p) => p.data).find((c) => c.id === currentChatId);
  let chat = singleChat || chatFromList;

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
    error: messagesError,
  } = useMessages(currentChatId, {
    enabled: !!currentChatId && activeChatId === currentChatId && !!chat,
  });

  const {
    jumpToMessage: jumpToMessageMutation,
    returnToLatest,
    clearJumpState,
    isJumped,
    jumpTargetId,
    jumpTimestamp,
  } = useJumpToMessageState(currentChatId);

  useEffect(() => {
    if (isMessagesError && messagesError) {
      const axiosError = messagesError as AxiosError;
      if (
        axiosError?.response?.status === 403 ||
        axiosError?.response?.status === 404 ||
        axiosError?.response?.status === 400
      ) {
        navigate("/", { replace: true });
      }
    }
  }, [isMessagesError, messagesError, navigate]);

  const messages = useMemo(
    () => messagesData?.pages.flatMap((p) => p.data || []).filter((m) => !!m) || [],
    [messagesData]
  );

  const initialCheckDoneRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      currentChatId &&
      activeChatId === currentChatId &&
      currentChatId !== initialCheckDoneRef.current
    ) {
      if (hasPreviousPage) {
        console.log("[ChatRoom] Force returning to latest messages on entry");
        returnToLatest();
      }
      initialCheckDoneRef.current = currentChatId;
    }
  }, [currentChatId, activeChatId, hasPreviousPage, returnToLatest]);

  useEffect(() => {
    if (isJumped) return;

    const isFetchingChat = isLoadingSingleChat || isFetchingSingleChat;

    if (!isFetchingChat && !chat && !isVirtual) {
      const status = (chatError as AxiosError)?.response?.status;
      const isNotFound = status === 404 || status === 400;

      if (isNotFound) {
        navigate("/", { replace: true });
        return;
      }

      if (!isChatError) {
        const timer = setTimeout(() => {
          if (!chat) {
            navigate("/", { replace: true });
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [
    isLoadingSingleChat,
    isFetchingSingleChat,
    chat,
    isVirtual,
    navigate,
    isJumped,
    chatError,
    isChatError,
  ]);

  const derivedPartnerId =
    chat?.type === "private"
      ? (chat.other_user_id ??
        messages.find((m) => m.sender_id !== currentUser?.id)?.sender_id ??
        (chat.last_message?.sender_id !== currentUser?.id
          ? chat.last_message?.sender_id
          : undefined))
      : undefined;

  const partnerId = isVirtual ? targetUserId : derivedPartnerId;

  const isPartnerDeleted = chat?.type === "private" && chat?.other_user_is_deleted;

  const {
    data: partnerProfile,
    isError: isProfileError,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
    isFetching: isFetchingProfile,
    failureCount: profileFailureCount,
    error: profileError,
  } = useUserById(isPartnerDeleted ? null : partnerId || null);

  useEffect(() => {
    if (chatsData && isVirtual && targetUserId) {
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
    const isFetchingChat = isLoadingSingleChat || isFetchingSingleChat;
    const isFetchingVirtualProfile = isVirtual && (isProfileLoading || isFetchingProfile);

    const isChat404 = (chatError as AxiosError)?.response?.status === 404;
    const chatFails = chatFailureCount ?? 0;
    const isChatRetrying = chatFails > 0 && chatFails < 4 && !isChat404;

    const isProfile404 = (profileError as AxiosError)?.response?.status === 404;
    const profileFails = profileFailureCount ?? 0;
    const isProfileRetrying = profileFails > 0 && profileFails < 4 && !isProfile404;

    const isInRetryCycle = isChatRetrying || (!!partnerId && isProfileRetrying);

    const showSkeleton =
      (!chat && isFetchingChat) ||
      (isVirtual && !partnerProfile && isFetchingVirtualProfile) ||
      (!chat && isInRetryCycle);

    if (showSkeleton) {
      return <ChatHeaderSkeleton />;
    }

    if (chat) {
      return (
        <ChatHeader
          chat={chat}
          partnerId={partnerId}
          partnerProfile={partnerProfile}
          isProfileError={isProfileError}
          isProfileLoading={isProfileLoading}
          onRetryProfile={refetchProfile}
          isChatLoading={isLoadingSingleChat || isFetchingSingleChat}
          isChatError={isChatError}
          onRetryChat={refetchChat}
        />
      );
    }

    if (isChatError) {
      return <ChatHeaderSkeleton />;
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
    if (
      jumpTargetId &&
      !isMessagesLoading &&
      !isRefetching &&
      !isMessagesError &&
      !jumpError &&
      !jumpError &&
      groupedMessages.length === 0
    ) {
      setJumpError(true);
    }
  }, [
    jumpTargetId,
    isMessagesLoading,
    isRefetching,
    isMessagesError,
    jumpError,
    groupedMessages.length,
    clearJumpState,
  ]);

  const [attachments, setAttachments] = useState<Media[]>([]);
  const [returnToMessageId, setReturnToMessageId] = useState<string | null>(null);
  const [attachmentMode, setAttachmentMode] = useState(false);

  const [createdChatId, setCreatedChatId] = useState<string | null>(null);
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

  const lastMarkedReadMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentChatId || activeChatId !== currentChatId) return;

    queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
      { queryKey: ["chats"] },
      (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((c) => (c.id === currentChatId ? { ...c, unread_count: 0 } : c)),
          })),
        };
      }
    );

    queryClient.setQueryData<ChatListItem>(["chat", currentChatId], (old) =>
      old ? { ...old, unread_count: 0 } : old
    );

    const unreadCount = chat?.unread_count || chatFromList?.unread_count || 0;
    if (unreadCount > 0) {
      markAsRead(currentChatId);
    }
  }, [
    currentChatId,
    activeChatId,
    queryClient,
    markAsRead,
    chat?.unread_count,
    chatFromList?.unread_count,
  ]);

  const lastMessage = displayMessages[displayMessages.length - 1];
  const lastMessageId = lastMessage?.id;
  const lastMessageSenderId = lastMessage?.sender_id;

  useEffect(() => {
    if (!currentChatId || activeChatId !== currentChatId || !lastMessageId) return;

    const isMyMessage = lastMessageSenderId === currentUser?.id;
    const isAlreadyMarked = lastMarkedReadMessageIdRef.current === lastMessageId;

    if (!isMyMessage && !isAlreadyMarked) {
      const unreadCount = chat?.unread_count || chatFromList?.unread_count || 0;

      if (unreadCount === 0) {
        markAsRead(currentChatId);
      }

      lastMarkedReadMessageIdRef.current = lastMessageId;
    }
  }, [
    currentChatId,
    activeChatId,
    lastMessageId,
    lastMessageSenderId,
    currentUser?.id,
    markAsRead,
    chat?.unread_count,
    chatFromList?.unread_count,
  ]);

  const [isRemoteJumping, setIsRemoteJumping] = useState(false);

  const [isErrorNextPage, setIsErrorNextPage] = useState(false);
  const [isErrorPreviousPage, setIsErrorPreviousPage] = useState(false);

  const handleFetchNextPage = useCallback(async () => {
    setIsErrorNextPage(false);
    try {
      const result = await fetchNextPage();
      if (result.isError) {
        setIsErrorNextPage(true);
      }
    } catch {
      setIsErrorNextPage(true);
    }
  }, [fetchNextPage]);

  const handleFetchPreviousPage = useCallback(async () => {
    setIsErrorPreviousPage(false);
    try {
      const result = await fetchPreviousPage();
      if (result.isError) {
        setIsErrorPreviousPage(true);
      }
    } catch {
      setIsErrorPreviousPage(true);
    }
  }, [fetchPreviousPage]);

  const {
    virtualizerRef,
    items,
    scrollToBottom,
    activeStickyDate,
    handleScroll,
    showScrollButton,
    shifting,
  } = useVirtuaChat({
    messages,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    isErrorNextPage,
    isErrorPreviousPage,
    fetchNextPage: handleFetchNextPage,
    fetchPreviousPage: handleFetchPreviousPage,
    currentChatId,
  });

  const [displayedStickyDate, setDisplayedStickyDate] = useState<string | null>(null);
  const [isStickyDateVisible, setIsStickyDateVisible] = useState(false);

  useEffect(() => {
    if (activeStickyDate && activeStickyDate !== "Today") {
      setDisplayedStickyDate(activeStickyDate);
      setIsStickyDateVisible(true);
    } else {
      setIsStickyDateVisible(false);
    }
  }, [activeStickyDate]);

  useEffect(() => {
    setDisplayedStickyDate(null);
    setIsStickyDateVisible(false);
  }, [currentChatId]);

  const lastErrorTimeRef = useRef(0);

  useEffect(() => {
    if (isMessagesError) {
      lastErrorTimeRef.current = Date.now();
    }
  }, [isMessagesError]);

  const [failedJumpTargetId, setFailedJumpTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (isJumped && !hasPreviousPage && !isFetchingPreviousPage && !isMessagesLoading) {
      if (!showScrollButton) {
        clearJumpState();
      }
    }
  }, [
    isJumped,
    hasPreviousPage,
    isFetchingPreviousPage,
    isMessagesLoading,
    clearJumpState,
    showScrollButton,
  ]);

  const handleRemoteJump = useCallback(
    async (targetId: string) => {
      setJumpError(false);
      setFailedJumpTargetId(null);
      setIsRemoteJumping(true);

      const success = await jumpToMessageMutation(targetId);

      if (!success) {
        setIsRemoteJumping(false);
        setJumpError(true);
        setFailedJumpTargetId(targetId);
      }
    },
    [jumpToMessageMutation]
  );

  const { jumpToMessage: internalJumpToMessage, highlightedMessageId } = useJumpToMessage({
    onRemoteJump: handleRemoteJump,
    virtualizerRef,
    items,
  });

  const handleJumpToMessage = useCallback(
    (targetId: string, fromMessageId?: string) => {
      if (fromMessageId) {
        setReturnToMessageId(fromMessageId);
      }
      requestAnimationFrame(() => {
        internalJumpToMessage(targetId);
      });
    },
    [internalJumpToMessage]
  );

  const handleScrollToBottom = useCallback(() => {
    console.log(
      "[ChatRoom] handleScrollToBottom called. isJumped:",
      isJumped,
      "hasPreviousPage:",
      hasPreviousPage
    );
    setJumpError(false);
    setFailedJumpTargetId(null);

    if (isJumped && !hasPreviousPage) {
      scrollToBottom();
    } else if (isJumped || hasPreviousPage) {
      returnToLatest();
    } else {
      scrollToBottom();
    }
  }, [isJumped, hasPreviousPage, returnToLatest, scrollToBottom]);

  const prevIsFetchingNextPage = useRef(isFetchingNextPage);
  useEffect(() => {
    prevIsFetchingNextPage.current = isFetchingNextPage;
  }, [isFetchingNextPage]);

  const lastProcessedJumpTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jumpTargetId || !jumpTimestamp || isMessagesLoading) return;

    if (lastProcessedJumpTimestampRef.current === jumpTimestamp) return;

    const targetIndex = items.findIndex(
      (item) => item.type === "message" && item.message.id === jumpTargetId
    );

    if (targetIndex !== -1 && virtualizerRef.current) {
      lastProcessedJumpTimestampRef.current = jumpTimestamp;

      const isNearBottom = items.length - 1 - targetIndex < 5;
      const align = isNearBottom ? "end" : "center";

      virtualizerRef.current.scrollToIndex(targetIndex, { align });

      setTimeout(() => {
        setIsRemoteJumping(false);

        internalJumpToMessage(jumpTargetId);
      }, 500);
    } else {
      if (!isMessagesLoading && jumpTargetId) {
        console.warn("[Jump] Target fetched but not found in items. Resetting jump state.");
        setIsRemoteJumping(false);
        lastProcessedJumpTimestampRef.current = jumpTimestamp;
      }
    }
  }, [
    jumpTargetId,
    jumpTimestamp,
    isMessagesLoading,
    internalJumpToMessage,
    items,
    virtualizerRef,
  ]);

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
    clearJumpState();
    setJumpError(false);
    setFailedJumpTargetId(null);
  }, [currentChatId, clearJumpState]);

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

      const target = event.target as HTMLElement;
      if (target.closest('[id^="message-"]')) return;

      setActiveMessageId(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDeleteModal]);

  const handleClick = (messageId: string) => {
    setActiveMessageId((prev) => (prev === messageId ? null : messageId));
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

      if (isJumped && hasPreviousPage) {
        returnToLatest();
      }

      scrollToBottom();
    };

    const targetChatId = createdChatId || currentChatId;

    if (isVirtual && !targetChatId && targetUserId) {
      createPrivateChat(
        { target_user_id: targetUserId },
        {
          onSuccess: (newChat) => {
            setCreatedChatId(newChat.id);

            sendMessage(
              { ...payload, chat_id: newChat.id },
              {
                onSuccess: () => {
                  setCreatedChatId(null);
                  onSuccess();
                  navigate(`/chat/${newChat.id}`, { replace: true });
                },
                onError: () => {
                  toast.error("Failed to send message");
                },
              }
            );
          },
          onError: () => {
            toast.error("Failed to create chat");
          },
        }
      );
    } else if (targetChatId) {
      sendMessage(
        { ...payload, chat_id: targetChatId },
        {
          onSuccess: () => {
            if (createdChatId) {
              setCreatedChatId(null);
              navigate(`/chat/${targetChatId}`, { replace: true });
            }
            onSuccess();
          },
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
          setIsDeleteSubmitting(false);
        },
        onError: () => {
          toast.error("Failed to delete message");
          setIsDeleteSubmitting(false);
        },
      }
    );
  };

  const handleEditMessage = async (text: string, currentAttachments: Media[]) => {
    if (!editMessage || !currentChatId) return;

    if (!text.trim() && currentAttachments.length === 0) {
      return;
    }

    const payload: EditMessageRequest = {
      content: text.trim(),
      attachment_ids: currentAttachments.map((a) => a.id),
    };

    if (
      editMessage.content === payload.content &&
      JSON.stringify(editMessage.attachments?.map((a) => a.id)) ===
        JSON.stringify(payload.attachment_ids)
    ) {
      setEditMessage(null);
      setNewMessageText("");
      setAttachments([]);
      return;
    }

    try {
      await editMessageMutation({
        messageId: editMessage.id,
        chatId: currentChatId,
        data: payload,
        optimisticAttachments: [],
      });

      setEditMessage(null);
      setNewMessageText("");
      setAttachments([]);
      setAttachmentMode(false);
    } catch {
      toast.error("Failed to edit message");
    }
  };

  const handleReturnJump = useCallback(() => {
    if (returnToMessageId) {
      handleJumpToMessage(returnToMessageId);
      setReturnToMessageId(null);
    }
  }, [returnToMessageId, handleJumpToMessage]);

  return (
    <SidebarInset className="flex flex-col h-[100vh] relative overflow-hidden bg-sidebar">
      {renderHeader()}

      {isStickyDateVisible && displayedStickyDate && (
        <div className="absolute top-[63px] left-0 right-0 z-20 pointer-events-none flex justify-center py-2 sm:pr-2">
          <SystemMessageBadge>{displayedStickyDate}</SystemMessageBadge>
        </div>
      )}

      <div className="flex-1 min-h-0 w-full relative flex flex-col">
        {chat || isVirtual ? (
          <>
            {(isMessagesLoading && items.length === 0) || isRemoteJumping ? <ChatLoading /> : null}

            {((isMessagesError && items.length === 0) || jumpError) && (
              <ChatRetry
                title={jumpError && !isMessagesError ? "Message not found" : undefined}
                description={
                  jumpError && !isMessagesError
                    ? "The message you are looking for may have been deleted or is no longer available."
                    : undefined
                }
                onRetry={() => {
                  if (jumpError && failedJumpTargetId) {
                    setJumpError(false);
                    handleRemoteJump(failedJumpTargetId);
                  } else if (jumpError && jumpTargetId) {
                    setJumpError(false);
                    handleRemoteJump(jumpTargetId);
                  } else {
                    refetch();
                  }
                }}
              />
            )}

            <VList
              ref={virtualizerRef}
              className="h-full w-full chat-message-list py-1"
              style={{ height: "100%" }}
              shift={shifting}
              onScroll={handleScroll}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el && item.type === "message") {
                      messageRefs.current[item.message.id] = el;
                    }
                  }}
                  className={cn(
                    "px-2 py-1",
                    item.type === "date-separator" && "py-1 flex justify-center sticky-date-trigger"
                  )}
                >
                  {item.type === "message" ? (
                    item.message.type?.startsWith("system_") ? (
                      <SystemMessage message={item.message} />
                    ) : (
                      <MessageBubble
                        key={item.message.id}
                        message={item.message}
                        current={currentUser}
                        chat={chat ?? undefined}
                        setReplyTo={setReplyTo}
                        setEditMessage={setEditMessage}
                        setNewMessageText={setNewMessageText}
                        setAttachmentMode={setAttachmentMode}
                        textareaRef={textareaRef}
                        setMessageToDelete={setMessageToDelete}
                        setShowDeleteModal={setShowDeleteModal}
                        setAttachments={setAttachments}
                        highlightedMessageId={highlightedMessageId}
                        jumpToMessage={(id) => handleJumpToMessage(id, item.message.id)}
                        messageRefs={messageRefs}
                        activeMessageId={activeMessageId}
                        editMessage={editMessage}
                        isLoadingMessage={false}
                        isError={false}
                        handleClick={handleClick}
                        isBusy={isGlobalBusy}
                        partnerProfile={partnerProfile}
                      />
                    )
                  ) : item.type === "date-separator" ? (
                    <SystemMessageBadge>{item.date}</SystemMessageBadge>
                  ) : item.type === "loader" ? (
                    <div
                      className={cn(
                        "flex justify-center w-full",
                        item.id === "loader-top" ? "pb-1 pt-2" : "pt-1 pb-2"
                      )}
                    >
                      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-transparent">
                        <Spinner className="h-4 w-4" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex justify-center w-full",
                        item.direction === "up" ? "pb-1 pt-2" : "pt-1 pb-2"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-background border text-foreground hover:bg-muted h-8 w-8"
                        onClick={() =>
                          item.direction === "up"
                            ? handleFetchNextPage()
                            : handleFetchPreviousPage()
                        }
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </VList>
          </>
        ) : (
          <ChatLoading />
        )}
      </div>

      <ChatFooter
        onSendMessage={handleSendMessage}
        onEditMessage={(params) =>
          handleEditMessage(params.data.content || "", params.optimisticAttachments || [])
        }
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        editMessage={editMessage}
        setEditMessage={setEditMessage}
        textareaRef={textareaRef}
        newMessageText={newMessageText}
        setNewMessageText={setNewMessageText}
        attachments={attachments}
        setAttachments={setAttachments}
        attachmentMode={attachmentMode}
        setAttachmentMode={setAttachmentMode}
        uploadingFiles={uploadingFiles}
        setUploadingFiles={setUploadingFiles}
        uploadingKeysRef={uploadingKeysRef}
        isUploading={isUploading}
        isSending={isSending}
        uploadMedia={uploadMedia}
        partnerProfile={partnerProfile}
        chat={chat || undefined}
        scrollToBottom={handleScrollToBottom}
        showScrollButton={
          (showScrollButton || isJumped) &&
          !((isMessagesLoading || isRefetching || isRemoteJumping) && items.length === 0) &&
          !((isMessagesError || jumpError) && items.length === 0) &&
          !isRemoteJumping
        }
        showReturnButton={
          !!returnToMessageId &&
          !((isMessagesLoading || isRefetching || isRemoteJumping) && items.length === 0) &&
          !((isMessagesError || jumpError) && items.length === 0) &&
          !isRemoteJumping
        }
        onReturnJump={handleReturnJump}
        current={currentUser}
        isEditing={isEditing}
      />

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
        onConfirmDelete={() => messageToDelete && handleDeleteMessage(messageToDelete)}
        setMessageToDelete={setMessageToDelete}
        isLoading={isDeleteSubmitting}
      />
    </SidebarInset>
  );
};

export default ChatRoom;
