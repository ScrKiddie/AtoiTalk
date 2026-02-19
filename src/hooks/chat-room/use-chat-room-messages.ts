import { useJumpToMessage } from "@/hooks/chat-room/use-jump-to-message";
import { useVirtuaChat } from "@/hooks/chat-room/use-virtua-chat";
import { useJumpToMessage as useJumpToMessageState, useMessages } from "@/hooks/queries";
import { formatMessageDateLabel } from "@/lib/date-utils";
import { ChatListItem, Message } from "@/types";
import { AxiosError } from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface UseChatMessagesProps {
  currentChatId: string | null;
  activeChatId: string | null;
  chat: ChatListItem | undefined | null;
  isVirtual: boolean;
  chatError: unknown;
  isChatError: boolean;
  isLoadingSingleChat: boolean;
  isFetchingSingleChat: boolean;
}

export const useChatMessages = ({
  currentChatId,
  activeChatId,
  chat,
  isVirtual,
  chatError,
  isChatError,
  isLoadingSingleChat,
  isFetchingSingleChat,
}: UseChatMessagesProps) => {
  const navigate = useNavigate();

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

  const displayMessages = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const groupedMessages = useMemo(
    () =>
      displayMessages.reduce(
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
      ),
    [displayMessages]
  );

  const [jumpError, setJumpError] = useState(false);

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

  const [isRemoteJumping, setIsRemoteJumping] = useState(false);

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
    isJumping: isJumped || isRemoteJumping,
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
  const [returnToMessageId, setReturnToMessageId] = useState<string | null>(null);

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
  useEffect(() => {
    setReturnToMessageId(null);
    clearJumpState();
    setJumpError(false);
    setFailedJumpTargetId(null);
  }, [currentChatId, clearJumpState]);

  const handleReturnJump = useCallback(() => {
    if (returnToMessageId) {
      handleJumpToMessage(returnToMessageId);
      setReturnToMessageId(null);
    }
  }, [returnToMessageId, handleJumpToMessage]);

  return {
    messages,
    items,
    virtualizerRef,
    shifting,
    handleScroll,
    displayedStickyDate,
    isStickyDateVisible,
    isMessagesLoading,
    isMessagesError,
    isRefetching,
    refetchMessages: refetch,
    isJumped,
    jumpError,
    setJumpError,
    jumpTargetId,
    failedJumpTargetId,
    isRemoteJumping,
    returnToMessageId,
    setReturnToMessageId,
    handleRemoteJump,
    handleJumpToMessage,
    handleReturnJump,
    handleScrollToBottom,
    showScrollButton,
    highlightedMessageId,
    handleFetchNextPage,
    handleFetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
  };
};
