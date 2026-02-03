import { Message } from "@/types";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

interface UseChatScrollProps {
  currentChatId: string | null;
  messages: Message[];
  isMessagesLoading: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
  anchorMessageId: string | null;
  setAnchorMessageId: (id: string | null) => void;
  returnToMessageId: string | null;
  setReturnToMessageId: (id: string | null) => void;
  isPartnerTyping: boolean;
  isJumpingRef: React.MutableRefObject<boolean>;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export const useChatScroll = ({
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
  scrollRef: providedScrollRef,
}: UseChatScrollProps) => {
  const localScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = providedScrollRef || localScrollRef;
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const prevScrollHeightRef = useRef<number>(0);
  const isFetchingRef = useRef(isFetchingNextPage);
  const isInitialLoad = useRef(true);
  const prevChatIdRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);
  const wasInTopZoneRef = useRef(false);
  const wasInBottomZoneRef = useRef(false);
  const shouldForceScrollToBottomRef = useRef(false);

  const [prevCurrentChatId, setPrevCurrentChatId] = useState<string | null>(currentChatId);
  if (currentChatId !== prevCurrentChatId) {
    setPrevCurrentChatId(currentChatId);
    setHasScrolledToBottom(false);
    isInitialLoad.current = true;
    wasInTopZoneRef.current = false;
    wasInBottomZoneRef.current = false;
    prevScrollHeightRef.current = 0;
    shouldForceScrollToBottomRef.current = false;
  }

  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage;
    if (!isFetchingNextPage) {
      wasInTopZoneRef.current = false;
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    if (!isFetchingPreviousPage) {
      wasInBottomZoneRef.current = false;
    }
  }, [isFetchingPreviousPage]);

  useEffect(() => {
    wasInTopZoneRef.current = false;
    wasInBottomZoneRef.current = false;
  }, [anchorMessageId]);

  useLayoutEffect(() => {
    if (anchorMessageId && prevScrollHeightRef.current === 0) return;

    if (!isFetchingNextPage && prevScrollHeightRef.current > 0 && scrollRef.current) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeightRef.current;
      if (diff > 0) {
        scrollRef.current.scrollTop = scrollRef.current.scrollTop + diff;
        prevScrollHeightRef.current = 0;
      }
    }
  }, [messages, isFetchingNextPage, anchorMessageId, scrollRef]);

  useLayoutEffect(() => {
    if (scrollRef.current && messages.length > 0 && !isMessagesLoading) {
      const isChatSwitched = prevChatIdRef.current !== currentChatId;

      if (shouldForceScrollToBottomRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
        shouldForceScrollToBottomRef.current = false;
        return;
      }

      if (anchorMessageId) {
        if (isChatSwitched) {
          prevChatIdRef.current = currentChatId;
        }
        return;
      }

      if (isInitialLoad.current || isChatSwitched) {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }

        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });

        [50, 150, 300].forEach((delay) => {
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, delay);
        });

        isInitialLoad.current = false;
        prevChatIdRef.current = currentChatId;

        setHasScrolledToBottom(false);
        setTimeout(() => setHasScrolledToBottom(true), 800);
      } else {
        if (isAtBottomRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "auto",
          });
        }
      }
    }
  }, [messages.length, currentChatId, isMessagesLoading, anchorMessageId, scrollRef]);

  useEffect(() => {
    if (anchorMessageId) {
      setHasScrolledToBottom(false);
    } else {
      const timer = setTimeout(() => setHasScrolledToBottom(true), 500);
      return () => clearTimeout(timer);
    }
  }, [anchorMessageId]);

  useEffect(() => {
    if (isPartnerTyping && scrollRef.current && !anchorMessageId) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;

      if (isAtBottom) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [isPartnerTyping, anchorMessageId, scrollRef]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isDistanceFromBottom = scrollHeight - scrollTop - clientHeight > 400;
    setShowScrollButton(isDistanceFromBottom || hasPreviousPage);
  }, [hasPreviousPage, messages.length, anchorMessageId, returnToMessageId, scrollRef]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const isDistanceFromBottom = scrollHeight - scrollTop - clientHeight > 400;
      setShowScrollButton(isDistanceFromBottom || hasPreviousPage);

      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;

      const isNearTop = scrollTop < 100;

      if (anchorMessageId && !isJumpingRef.current) {
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (
          isNearBottom &&
          !wasInBottomZoneRef.current &&
          hasPreviousPage &&
          !isFetchingPreviousPage
        ) {
          fetchPreviousPage();
        }
        wasInBottomZoneRef.current = isNearBottom;

        if (isNearTop && !wasInTopZoneRef.current && hasNextPage && !isFetchingNextPage) {
          prevScrollHeightRef.current = scrollHeight;
          fetchNextPage();
        }
        wasInTopZoneRef.current = isNearTop;
        return;
      }

      if (isNearTop && !wasInTopZoneRef.current && hasNextPage && !isFetchingNextPage) {
        prevScrollHeightRef.current = scrollHeight;

        console.log("[Scroll] Triggering NEXT page fetch", {
          isNearTop,
          wasInTop: wasInTopZoneRef.current,
          height: scrollHeight,
        });

        fetchNextPage();
      }
      wasInTopZoneRef.current = isNearTop;

      if (returnToMessageId && !isJumpingRef.current) {
        const originElement = document.getElementById(`message-${returnToMessageId}`);
        if (originElement) {
          const rect = originElement.getBoundingClientRect();
          const containerRect = e.currentTarget.getBoundingClientRect();

          if (rect.bottom < containerRect.top) {
            setReturnToMessageId(null);
          }
        }
      }
    },
    [
      anchorMessageId,
      hasNextPage,
      hasPreviousPage,
      isFetchingNextPage,
      isFetchingPreviousPage,
      fetchNextPage,
      fetchPreviousPage,
      returnToMessageId,
      isJumpingRef,
      setReturnToMessageId,
    ]
  );

  const scrollToBottom = useCallback(() => {
    shouldForceScrollToBottomRef.current = true;
    if (anchorMessageId) {
      setAnchorMessageId(null);
    }

    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
      }
    }, 0);
  }, [anchorMessageId, setAnchorMessageId, scrollRef]);

  return {
    scrollRef,
    showScrollButton,
    setShowScrollButton,
    handleScroll,
    scrollToBottom,
    isScrollReady: hasScrolledToBottom && currentChatId === prevCurrentChatId,
  };
};
