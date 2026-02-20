import { debugLog, errorLog } from "@/lib/logger";
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
    if (!token) {
      debugLog("WebSocket connect skipped: no token");
      return;
    }
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      debugLog("WebSocket connect skipped: socket already active", wsRef.current.readyState);
      return;
    }

    const wsUrl = new URL(url);
    wsUrl.searchParams.append("token", token);
    debugLog("WebSocket connecting", { host: wsUrl.host, path: wsUrl.pathname });

    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      debugLog("WebSocket connected");
      setIsConnected(true);
      isFirstConnectionRef.current = false;
      reconnectAttemptRef.current = 0;
      onOpen();
    };

    ws.onmessage = onMessage;

    ws.onerror = (error) => errorLog("WS Error:", error);

    ws.onclose = (event) => {
      debugLog("WebSocket closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      setIsConnected(false);
      wsRef.current = null;

      if (
        !isIntentionalCloseRef.current &&
        reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS &&
        token
      ) {
        const backoffMs = getBackoffMs(reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;
        debugLog("WebSocket scheduling reconnect", {
          attempt: reconnectAttemptRef.current,
          backoffMs,
        });

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffMs);
      } else if (isIntentionalCloseRef.current) {
        debugLog("WebSocket reconnect skipped: intentional close");
      } else if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        debugLog("WebSocket reconnect stopped: max attempts reached");
      }
    };
  }, [url, token, onOpen, onMessage, wsRef]);

  useEffect(() => {
    if (!token) {
      debugLog("WebSocket effect skipped: no token");
      return;
    }

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
        debugLog("WebSocket cleanup close");
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }
    };
  }, [token, connect, wsRef]);

  return { wsRef, isConnected };
};
