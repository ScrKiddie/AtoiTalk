import { useChatWebSocket } from "@/hooks/use-chat-ws";
import React, { createContext, useContext } from "react";

interface WebSocketContextType {
  sendTyping: (chatId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { sendTyping } = useChatWebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws");

  return <WebSocketContext.Provider value={{ sendTyping }}>{children}</WebSocketContext.Provider>;
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within a WebSocketProvider");
  }
  return context;
};
