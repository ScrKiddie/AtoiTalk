import { useVirtuaChat } from "@/hooks/chat-room/use-virtua-chat";
import { useMessages } from "@/hooks/queries";
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

  const isJumped = false;
  const jumpTargetId = null;

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

  const setJumpError = () => {};
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

  const isRemoteJumping = false;

  const {
    virtualizerRef,
    items,
    activeStickyDate,
    handleScroll,
    showScrollButton,
    shifting,
    isReadyToDisplay,
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
    isJumping: false,
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

  const failedJumpTargetId = null;

  const handleRemoteJump = async () => {};

  const highlightedMessageId = null;

  const returnToMessageId = null;

  const handleJumpToMessage = () => {};

  const handleScrollToBottom = () => {};

  const handleReturnJump = () => {};

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
    jumpError: false,
    setJumpError,
    jumpTargetId,
    failedJumpTargetId,
    isRemoteJumping,
    returnToMessageId,
    setReturnToMessageId: () => {},
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
  };
};
