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

  useEffect(() => {
    const wasFetching = prevFetchingRef.current;

    if (wasFetching && !isFetchingNextPage && isError) {
      wasInBottomZoneRef.current = false;
    }

    prevFetchingRef.current = isFetchingNextPage;
  }, [isFetchingNextPage, isError]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

      const isNearBottom = scrollHeight - scrollTop - clientHeight < 35;

      if (isNearBottom && !wasInBottomZoneRef.current && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
      wasInBottomZoneRef.current = isNearBottom;
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    if (!isFetchingNextPage && hasNextPage && !isError && scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight <= clientHeight) {
        fetchNextPage();
      }
    }
  }, [isFetchingNextPage, hasNextPage, isError, fetchNextPage, scrollRef]);

  return {
    scrollRef,
    handleScroll,
  };
};
