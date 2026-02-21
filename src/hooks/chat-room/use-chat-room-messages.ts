import { useVirtuaChat } from "@/hooks/chat-room/use-virtua-chat";
import { useMessages, useJumpToMessage as useQueryJump } from "@/hooks/queries";
import { formatMessageDateLabel } from "@/lib/date-utils";
import { debugLog, errorLog } from "@/lib/logger";
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

  const { jumpToMessage, returnToLatest, isJumped, jumpTargetId, jumpTimestamp, clearJumpState } =
    useQueryJump(currentChatId);

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
      initialCheckDoneRef.current = currentChatId;
    }
  }, [currentChatId, activeChatId]);

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

  useMemo(
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
  const [isRemoteJumping, setIsRemoteJumping] = useState(false);
  const [failedJumpTargetId, setFailedJumpTargetId] = useState<string | null>(null);

  const [isErrorNextPage, setIsErrorNextPage] = useState(false);
  const [isErrorPreviousPage, setIsErrorPreviousPage] = useState(false);

  const handleFetchNextPage = useCallback(async () => {
    setIsErrorNextPage(false);
    try {
      debugLog("Fetch next page");
      const result = await fetchNextPage();
      if (result.isError) {
        debugLog("Fetch next page returned error");
        setIsErrorNextPage(true);
      }
    } catch {
      debugLog("Fetch next page threw");
      setIsErrorNextPage(true);
    }
  }, [fetchNextPage]);

  const handleFetchPreviousPage = useCallback(async () => {
    setIsErrorPreviousPage(false);
    try {
      debugLog("Fetch previous page");
      const result = await fetchPreviousPage();
      if (result.isError) {
        debugLog("Fetch previous page returned error");
        setIsErrorPreviousPage(true);
      }
    } catch {
      debugLog("Fetch previous page threw");
      setIsErrorPreviousPage(true);
    }
  }, [fetchPreviousPage]);

  const {
    virtualizerRef,
    items,
    activeStickyDate,
    handleScroll,
    showScrollButton,
    shifting,
    isReadyToDisplay,
    highlightedMessageId,
    scrollToMessage,
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
    jumpTargetId,
    jumpTimestamp,
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

  const [returnStack, setReturnStack] = useState<string[]>([]);
  const pendingReturnExitTargetRef = useRef<string | null>(null);
  const prevChatIdRef = useRef(currentChatId);

  useEffect(() => {
    if (currentChatId !== prevChatIdRef.current) {
      prevChatIdRef.current = currentChatId;
      setReturnStack([]);
      pendingReturnExitTargetRef.current = null;
      if (isJumped) returnToLatest();
    }
  }, [currentChatId, isJumped, returnToLatest]);

  const handleRemoteJump = useCallback(
    async (targetId: string) => {
      debugLog("Remote jump requested", { targetId, currentChatId });
      setIsRemoteJumping(true);
      setJumpError(false);
      setFailedJumpTargetId(null);

      try {
        const success = await jumpToMessage(targetId);
        if (!success) {
          debugLog("Remote jump not found after fetch", { targetId, currentChatId });
          setJumpError(true);
          setFailedJumpTargetId(targetId);
          return false;
        } else {
          debugLog("Remote jump success", { targetId, currentChatId });
          return true;
        }
      } catch (error) {
        errorLog("Jump failed:", error);
        debugLog("Remote jump failed", { targetId, currentChatId });
        setJumpError(true);
        setFailedJumpTargetId(targetId);
        return false;
      } finally {
        setIsRemoteJumping(false);
      }
    },
    [jumpToMessage, currentChatId]
  );

  const handleJumpToMessage = useCallback(
    (targetId: string, fromMessageId?: string) => {
      if (fromMessageId) {
        setReturnStack([fromMessageId]);
      }

      if (!scrollToMessage(targetId)) {
        debugLog("Local jump miss, fallback to remote", {
          targetId,
          fromMessageId: fromMessageId ?? null,
        });
        handleRemoteJump(targetId);
      } else {
        debugLog("Local jump success", {
          targetId,
          fromMessageId: fromMessageId ?? null,
        });
      }
    },
    [scrollToMessage, handleRemoteJump, isJumped, items.length]
  );

  const handleScrollToBottom = useCallback(() => {
    if (hasPreviousPage) {
      returnToLatest();
    } else {
      if (isJumped) {
        clearJumpState();
      }
      virtualizerRef.current?.scrollToIndex(items.length - 1, { align: "end" });
    }
  }, [hasPreviousPage, returnToLatest, isJumped, clearJumpState, items.length]);

  const handleReturnJump = useCallback(() => {
    if (returnStack.length > 0) {
      const lastSourceId = returnStack[returnStack.length - 1];
      setReturnStack((prev) => prev.slice(0, -1));

      if (scrollToMessage(lastSourceId)) {
        pendingReturnExitTargetRef.current = null;
        clearJumpState();
      } else {
        pendingReturnExitTargetRef.current = lastSourceId;
        void handleRemoteJump(lastSourceId).then((success) => {
          if (!success && pendingReturnExitTargetRef.current === lastSourceId) {
            pendingReturnExitTargetRef.current = null;
          }
        });
      }
    } else {
      pendingReturnExitTargetRef.current = null;
      returnToLatest();
    }
  }, [returnStack, scrollToMessage, handleRemoteJump, returnToLatest, clearJumpState]);

  useEffect(() => {
    const pendingTarget = pendingReturnExitTargetRef.current;
    if (!pendingTarget) return;
    if (highlightedMessageId !== pendingTarget) return;

    clearJumpState();
    pendingReturnExitTargetRef.current = null;
  }, [highlightedMessageId, clearJumpState]);

  useEffect(() => {
    if (isJumped && !hasPreviousPage && !isRemoteJumping) {
      const timer = setTimeout(() => {
        clearJumpState();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isJumped, hasPreviousPage, isRemoteJumping, clearJumpState]);

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
    returnToMessageId: null,
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
    isReadyToDisplay,
    returnStack,
  };
};
