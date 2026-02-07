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
}: UseVirtuaChatProps) => {
  const virtualizerRef = useRef<VListHandle>(null);
  const [activeStickyDate, setActiveStickyDate] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [shifting, setShifting] = useState(false);

  useEffect(() => {
    setShifting(isFetchingNextPage);
  }, [isFetchingNextPage]);

  useEffect(() => {
    setActiveStickyDate(null);
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

  const itemCount = items.length;
  const topItemId = items.length > 0 ? items[0].id : null;
  useEffect(() => {
    if (fetchedTopCountRef.current !== -1) {
      fetchedTopCountRef.current = -1;
    }
    if (fetchedBottomCountRef.current !== -1) {
      fetchedBottomCountRef.current = -1;
    }
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
      setShowScrollButton(!atBottom);

      if (wasAtBottomRef.current && !isFetchingNextPage && items.length > 0) {
        scrollToBottom();
      }
    });
  }, [items.length, isFetchingNextPage, scrollToBottom]);

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
      setShowScrollButton(!atBottom);

      wasAtBottomRef.current = atBottom && !hasPreviousPage;

      if (offset <= 200 && hasNextPage && !isFetchingNextPage && !isErrorNextPage) {
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
    }
  }, [items.length, currentChatId]);

  useEffect(() => {
    if (
      currentChatId &&
      initialScrollDone.current !== currentChatId &&
      items.length > 0 &&
      virtualizerRef.current
    ) {
      virtualizerRef.current.scrollToIndex(items.length - 1, { align: "end" });
      initialScrollDone.current = currentChatId;
    }
  }, [currentChatId, items.length]);

  return {
    virtualizerRef,
    items,
    scrollToBottom,
    handleScroll,
    activeStickyDate,
    showScrollButton,
    shifting,
  };
};
