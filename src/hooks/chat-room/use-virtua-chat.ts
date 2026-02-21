import { formatMessageDateLabel } from "@/lib/date-utils";
import { Message } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VListHandle } from "virtua";

export type ChatItem =
  | { type: "date-separator"; date: string; id: string }
  | { type: "message"; message: Message; date: string; id: string }
  | { type: "loader"; id: string }
  | { type: "error"; id: string; direction: "up" | "down" };

interface UseVirtuaChatProps {
  messages: Message[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  isErrorNextPage: boolean;
  isErrorPreviousPage: boolean;
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
  currentChatId: string | null;
  isJumping?: boolean;
  jumpTargetId?: string | null;
  jumpTimestamp?: number | null;
}

export const useVirtuaChat = ({
  messages,
  hasNextPage,
  hasPreviousPage,
  isFetchingNextPage,
  isFetchingPreviousPage,
  isErrorNextPage,
  isErrorPreviousPage,
  fetchNextPage,
  fetchPreviousPage,
  currentChatId,
  isJumping = false,
  jumpTargetId,
  jumpTimestamp,
}: UseVirtuaChatProps) => {
  const virtualizerRef = useRef<VListHandle>(null);
  const [activeStickyDate, setActiveStickyDate] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isReadyToDisplay, setIsReadyToDisplay] = useState(false);

  const [shifting, setShifting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isJumping) {
      setShifting(isFetchingNextPage);
    } else {
      setShifting(false);
    }
  }, [isFetchingNextPage, isJumping]);

  useEffect(() => {
    setActiveStickyDate(null);
    setIsReadyToDisplay(false);
  }, [currentChatId]);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [messages]
  );

  const items: ChatItem[] = useMemo(() => {
    const result: ChatItem[] = [];

    if (hasNextPage) {
      if (isErrorNextPage) {
        result.push({ type: "error", id: "error-top", direction: "up" });
      } else {
        result.push({ type: "loader", id: "loader-top" });
      }
    }

    sortedMessages.forEach((msg, index) => {
      const date = formatMessageDateLabel(msg.created_at);
      const prevMsg = sortedMessages[index - 1];
      const prevDate = prevMsg ? formatMessageDateLabel(prevMsg.created_at) : null;

      if (date !== prevDate) {
        result.push({ type: "date-separator", date, id: `date-${date}-${msg.id}` });
      }
      result.push({ type: "message", message: msg, date, id: msg.id });
    });

    if (hasPreviousPage) {
      if (isErrorPreviousPage) {
        result.push({ type: "error", id: "error-bottom", direction: "down" });
      } else {
        result.push({ type: "loader", id: "loader-bottom" });
      }
    }

    return result;
  }, [sortedMessages, hasNextPage, hasPreviousPage, isErrorNextPage, isErrorPreviousPage]);

  const fetchedTopCountRef = useRef(-1);
  const fetchedBottomCountRef = useRef(-1);
  const topThresholdArmedRef = useRef(true);
  const blockTopAutoFetchUntilRearmedRef = useRef(false);

  useEffect(() => {
    blockTopAutoFetchUntilRearmedRef.current = false;
    topThresholdArmedRef.current = true;
  }, [currentChatId]);

  const itemCount = items.length;
  const topItemId = items.length > 0 ? items[0].id : null;
  useEffect(() => {
    if (fetchedTopCountRef.current !== -1) {
      fetchedTopCountRef.current = -1;
    }
    if (fetchedBottomCountRef.current !== -1) {
      fetchedBottomCountRef.current = -1;
    }

    if (!blockTopAutoFetchUntilRearmedRef.current) return;

    const ref = virtualizerRef.current;
    if (!ref) return;

    const offset = ref.scrollOffset;
    topThresholdArmedRef.current = offset > 200;
  }, [itemCount, topItemId]);

  const scrollToBottom = useCallback(() => {
    if (virtualizerRef.current && items.length > 0) {
      virtualizerRef.current.scrollToIndex(items.length - 1, { align: "end" });
    }
  }, [items.length]);

  const wasAtBottomRef = useRef(true);

  useEffect(() => {
    const ref = virtualizerRef.current;
    if (!ref) return;

    requestAnimationFrame(() => {
      const offset = ref.scrollOffset;

      const atBottom = offset >= ref.scrollSize - ref.viewportSize - 200;
      setShowScrollButton(!atBottom || hasPreviousPage);

      if (wasAtBottomRef.current && !isFetchingNextPage && items.length > 0 && !isJumping) {
        scrollToBottom();
      }
    });
  }, [items.length, isFetchingNextPage, scrollToBottom, isJumping]);

  const handleScroll = useCallback(
    (offset: number) => {
      const ref = virtualizerRef.current;
      if (!ref) return;

      const isScrollable = ref.scrollSize > ref.viewportSize + 10;
      if (!isScrollable) {
        setActiveStickyDate(null);
      } else {
        const topIndex = ref.findItemIndex(offset);
        if (topIndex !== -1 && items[topIndex]) {
          const item = items[topIndex];
          if (item.type === "message" || item.type === "date-separator") {
            setActiveStickyDate(item.date);
          } else {
            setActiveStickyDate(null);
          }
        }
      }

      const atBottom = offset >= ref.scrollSize - ref.viewportSize - 200;
      setShowScrollButton(!atBottom || hasPreviousPage);

      wasAtBottomRef.current = atBottom && !hasPreviousPage;

      const isNearTop = offset <= 200;
      if (!isNearTop) {
        topThresholdArmedRef.current = true;
        blockTopAutoFetchUntilRearmedRef.current = false;
      }

      const topFetchBlocked =
        blockTopAutoFetchUntilRearmedRef.current && !topThresholdArmedRef.current;

      if (!topFetchBlocked && isNearTop && hasNextPage && !isFetchingNextPage && !isErrorNextPage) {
        if (blockTopAutoFetchUntilRearmedRef.current) {
          topThresholdArmedRef.current = false;
        }
        if (fetchedTopCountRef.current < items.length) {
          fetchedTopCountRef.current = items.length;
          fetchNextPage();
        }
      }

      if (atBottom && hasPreviousPage && !isFetchingPreviousPage && !isErrorPreviousPage) {
        if (fetchedBottomCountRef.current < items.length) {
          fetchedBottomCountRef.current = items.length;
          fetchPreviousPage();
        }
      }
    },
    [
      items,
      hasNextPage,
      isFetchingNextPage,
      fetchNextPage,
      hasPreviousPage,
      isFetchingPreviousPage,
      fetchPreviousPage,
      setShowScrollButton,
      isErrorNextPage,
      isErrorPreviousPage,
    ]
  );

  const initialScrollDone = useRef<string | null>(null);

  useEffect(() => {
    if (items.length === 0 && currentChatId) {
      initialScrollDone.current = null;
      setIsReadyToDisplay(false);
    }
  }, [items.length, currentChatId]);

  const prevIsJumpingRef = useRef(isJumping);

  useEffect(() => {
    if (isJumping && !prevIsJumpingRef.current) {
      setIsReadyToDisplay(false);
    }

    if (!isJumping && prevIsJumpingRef.current) {
      blockTopAutoFetchUntilRearmedRef.current = true;
      const ref = virtualizerRef.current;
      topThresholdArmedRef.current = !!ref && ref.scrollOffset > 200;
    }

    prevIsJumpingRef.current = isJumping;
  }, [isJumping]);

  useEffect(() => {
    if (
      currentChatId &&
      initialScrollDone.current !== currentChatId &&
      items.length > 0 &&
      virtualizerRef.current &&
      !isJumping
    ) {
      virtualizerRef.current.scrollToIndex(items.length - 1, { align: "end" });
      initialScrollDone.current = currentChatId;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsReadyToDisplay(true);
          }, 100);
        });
      });
    } else if (isJumping && items.length > 0 && currentChatId) {
      if (initialScrollDone.current !== currentChatId) {
        initialScrollDone.current = currentChatId;
      }
    }
  }, [currentChatId, items.length, isJumping]);

  const lastSuccessfulJump = useRef<{ id: string; timestamp: number } | null>(null);
  const [internalHighlightedId, setInternalHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isJumping || !jumpTargetId || items.length === 0 || !virtualizerRef.current) return;

    if (
      lastSuccessfulJump.current &&
      lastSuccessfulJump.current.id === jumpTargetId &&
      lastSuccessfulJump.current.timestamp === (jumpTimestamp || 0)
    ) {
      return;
    }

    const performJump = () => {
      const index = items.findIndex((item) => {
        if (item.type === "message") {
          return item.message.id === jumpTargetId;
        }
        return false;
      });

      if (index !== -1 && virtualizerRef.current) {
        virtualizerRef.current.scrollToIndex(index, { align: "center" });
        lastSuccessfulJump.current = { id: jumpTargetId, timestamp: jumpTimestamp || 0 };
        setInternalHighlightedId(jumpTargetId);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setInternalHighlightedId(null);
        }, 1000);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              setIsReadyToDisplay(true);
            }, 100);
          });
        });
        return true;
      }
      return false;
    };

    if (performJump()) return;

    let attempts = 0;
    const maxAttempts = 10;

    const interval = setInterval(() => {
      attempts++;
      if (performJump() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isJumping, jumpTargetId, jumpTimestamp, items]);

  return {
    virtualizerRef,
    items,
    scrollToBottom,
    handleScroll,
    activeStickyDate,
    showScrollButton,
    shifting,
    isReadyToDisplay,
    highlightedMessageId: internalHighlightedId,
    scrollToMessage: (messageId: string) => {
      if (!virtualizerRef.current) return false;
      const index = items.findIndex((item) => {
        if (item.type === "message") {
          return item.message.id === messageId;
        }
        return false;
      });

      if (index !== -1) {
        virtualizerRef.current.scrollToIndex(index, { align: "center" });
        setInternalHighlightedId(messageId);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setInternalHighlightedId(null);
        }, 1000);
        return true;
      }
      return false;
    },
  };
};
