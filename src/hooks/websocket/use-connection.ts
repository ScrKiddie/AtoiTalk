import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RECONNECT_ATTEMPTS = 10;
const getBackoffMs = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

export const useConnection = (
  url: string,
  token: string | null,
  onOpen: () => void,
  onMessage: (event: MessageEvent) => void,
  externalWsRef?: React.MutableRefObject<WebSocket | null>
) => {
  const localWsRef = useRef<WebSocket | null>(null);
  const wsRef = externalWsRef || localWsRef;

  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionalCloseRef = useRef(false);
  const isFirstConnectionRef = useRef(true);

  const connect = useCallback(() => {
    if (!token) return;
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    )
      return;

    const wsUrl = new URL(url);
    wsUrl.searchParams.append("token", token);

    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      isFirstConnectionRef.current = false;
      reconnectAttemptRef.current = 0;
      onOpen();
    };

    ws.onmessage = onMessage;

    ws.onerror = (error) => console.error("WS Error:", error);

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      if (
        !isIntentionalCloseRef.current &&
        reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS &&
        token
      ) {
        const backoffMs = getBackoffMs(reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffMs);
      }
    };
  }, [url, token, onOpen, onMessage, wsRef]);

  useEffect(() => {
    if (!token) return;

    isIntentionalCloseRef.current = false;
    isFirstConnectionRef.current = true;
    reconnectAttemptRef.current = 0;

    connect();

    return () => {
      isIntentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }
    };
  }, [token, connect, wsRef]);

  return { wsRef, isConnected };
};
