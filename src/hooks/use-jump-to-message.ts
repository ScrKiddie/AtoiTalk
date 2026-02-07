import { toast } from "@/lib/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { VListHandle } from "virtua";
import { ChatItem } from "./use-virtua-chat";

export function useJumpToMessage({
  onRemoteJump,
  virtualizerRef,
  items,
}: {
  onRemoteJump?: (targetId: string) => void;
  virtualizerRef: React.RefObject<VListHandle | null>;
  items: ChatItem[];
}) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const jumpToMessage = useCallback(
    (messageId: string) => {
      const index = items.findIndex((item) => {
        if (item.type === "message") {
          return item.message.id === messageId;
        }
        return item.id === messageId;
      });

      if (index !== -1 && virtualizerRef.current) {
        virtualizerRef.current.scrollToIndex(index, { align: "center" });

        setHighlightedMessageId(messageId);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setHighlightedMessageId(null);
        }, 2000);
        return true;
      } else {
        if (onRemoteJump) {
          onRemoteJump(messageId);
          return false;
        }
        toast.info("Message not found within loaded items.");
        return false;
      }
    },
    [onRemoteJump, virtualizerRef, items]
  );

  return {
    jumpToMessage,
    highlightedMessageId,
  };
}
