import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useJumpToMessage({
  onRemoteJump,
  scrollRef,
}: {
  onRemoteJump?: (targetId: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
} = {}) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);
  const resizeObserverRef = useRef<ResizeObserver | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (observerRef.current) observerRef.current.disconnect();
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    };
  }, []);

  const jumpToMessage = useCallback(
    (messageId: string) => {
      const element = document.getElementById(`message-${messageId}`);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        setHighlightedMessageId(null);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      if (element) {
        const performScroll = (isCorrection = false) => {
          if (scrollRef?.current) {
            const container = scrollRef.current;
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const relativeTop = elementRect.top - containerRect.top;

            const targetScrollTop =
              container.scrollTop +
              relativeTop -
              container.clientHeight / 2 +
              elementRect.height / 2;

            const distance = Math.abs(targetScrollTop - container.scrollTop);
            const isFar = distance > 2000;

            const behavior = isCorrection || isFar ? "auto" : "smooth";

            container.scrollTo({
              top: targetScrollTop,
              behavior: behavior,
            });
          } else {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        };

        performScroll();

        const resizeObserver = new ResizeObserver(() => {
          performScroll(true);
        });

        resizeObserver.observe(element);

        if (scrollRef?.current && scrollRef.current.firstElementChild) {
          resizeObserver.observe(scrollRef.current.firstElementChild);
        }

        resizeObserverRef.current = resizeObserver;

        setTimeout(() => {
          resizeObserver.disconnect();
        }, 2000);

        const observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry.isIntersecting) {
              setHighlightedMessageId(messageId);

              timeoutRef.current = setTimeout(() => {
                setHighlightedMessageId(null);
              }, 2000);

              observer.disconnect();
              observerRef.current = undefined;
            }
          },
          {
            threshold: 0.1,
          }
        );

        observerRef.current = observer;
        observer.observe(element);
      } else {
        if (onRemoteJump) {
          onRemoteJump(messageId);
          return;
        }
        toast.info("Pesan asli terlalu lama atau belum dimuat.");
      }
    },
    [onRemoteJump, scrollRef]
  );

  return {
    jumpToMessage,
    highlightedMessageId,
  };
}
