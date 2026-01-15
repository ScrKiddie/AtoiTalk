import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useJumpToMessage({
  onRemoteJump,
}: { onRemoteJump?: (targetId: string) => void } = {}) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (observerRef.current) observerRef.current.disconnect();
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

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });

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
            threshold: 0.5,
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
    [onRemoteJump]
  );

  return {
    jumpToMessage,
    highlightedMessageId,
  };
}
