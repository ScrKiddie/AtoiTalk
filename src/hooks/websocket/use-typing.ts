import { useChatStore } from "@/store";
import { useCallback, useRef } from "react";

export const useTyping = (
  wsRef: React.MutableRefObject<WebSocket | null>,
  currentUser: { id: string } | null
) => {
  const setUserTyping = useChatStore((state) => state.setUserTyping);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const handleTypingEvent = useCallback(
    (data: {
      meta?: { chat_id?: string; sender_id?: string };
      payload?: { chat_id?: string; sender_id?: string; user_id?: string };
    }) => {
      const chatId = data.meta?.chat_id || data.payload?.chat_id;
      const senderId = data.meta?.sender_id || data.payload?.sender_id || data.payload?.user_id;

      if (senderId === currentUser?.id) {
        return;
      }

      if (chatId && senderId) {
        setUserTyping(chatId, senderId, true);

        const key = `${chatId}-${senderId}`;
        if (typingTimeoutsRef.current[key]) {
          clearTimeout(typingTimeoutsRef.current[key]);
        }

        typingTimeoutsRef.current[key] = setTimeout(() => {
          setUserTyping(chatId, senderId, false);
          delete typingTimeoutsRef.current[key];
        }, 5000);
      }
    },
    [currentUser, setUserTyping]
  );

  const sendTyping = useCallback(
    (chatId: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "chat.typing",
            meta: {
              chat_id: chatId,
            },
          })
        );
      }
    },
    [wsRef]
  );

  const clearTypingTimeout = useCallback((key: string) => {
    if (typingTimeoutsRef.current[key]) {
      clearTimeout(typingTimeoutsRef.current[key]);
      delete typingTimeoutsRef.current[key];
    }
  }, []);

  return { handleTypingEvent, sendTyping, clearTypingTimeout, typingTimeoutsRef };
};
