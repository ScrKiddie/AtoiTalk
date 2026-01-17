import { useCallback, useEffect, useRef } from "react";

interface UseChatListScrollProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  fetchNextPage: () => void;
}

export const useChatListScroll = ({
  hasNextPage,
  isFetchingNextPage,
  isError,
  fetchNextPage,
}: UseChatListScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasInBottomZoneRef = useRef(false);
  const prevFetchingRef = useRef(isFetchingNextPage);

  const prevIsErrorRef = useRef(isError);

  useEffect(() => {
    if (
      isFetchingNextPage &&
      !prevFetchingRef.current &&
      wasInBottomZoneRef.current &&
      scrollRef.current &&
      prevIsErrorRef.current
    ) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }

    prevFetchingRef.current = isFetchingNextPage;
    prevIsErrorRef.current = isError;
  }, [isFetchingNextPage, isError]);

  const lastScrollHeightRef = useRef(0);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

      const isNearBottom = scrollHeight - scrollTop - clientHeight < 35;
      const isLayoutShift = Math.abs(scrollHeight - lastScrollHeightRef.current) > 10;
      lastScrollHeightRef.current = scrollHeight;

      if (isNearBottom && hasNextPage && !isFetchingNextPage) {
        if (!wasInBottomZoneRef.current) {
          fetchNextPage();
        } else if (isError && !isLayoutShift) {
          fetchNextPage();
        }
      }
      wasInBottomZoneRef.current = isNearBottom;
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, isError]
  );

  useEffect(() => {
    if (!isFetchingNextPage && hasNextPage && !isError && scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight <= clientHeight) {
        fetchNextPage();
      }
    }
  }, [isFetchingNextPage, hasNextPage, isError, fetchNextPage, scrollRef]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!isError || isFetchingNextPage || !hasNextPage || !scrollRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

      if (isAtBottom && e.deltaY > 0) {
        fetchNextPage();
      }
    },
    [isError, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  return {
    scrollRef,
    handleScroll,
    handleWheel,
  };
};
