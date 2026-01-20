import { chatService } from "@/services/chat.service";
import { userService } from "@/services/user.service";
import { useAuthStore, useChatStore } from "@/store";
import { ChatListItem, Message, PaginatedResponse, User, UserUpdateEventPayload } from "@/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RECONNECT_ATTEMPTS = 10;
const getBackoffMs = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

export const useChatWebSocket = (url: string) => {
  const queryClient = useQueryClient();

  const setUserTyping = useChatStore((state) => state.setUserTyping);
  const clearUserTypingGlobal = useChatStore((state) => state.clearUserTypingGlobal);
  const setUserOnline = useChatStore((state) => state.setUserOnline);

  const token = useAuthStore((state) => state.token);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionalCloseRef = useRef(false);
  const isFirstConnectionRef = useRef(true);

  const handleReconnect = useCallback(() => {
    const activeChatId = useChatStore.getState().activeChatId;

    queryClient.invalidateQueries({ queryKey: ["chats"] });

    if (activeChatId) {
      queryClient.invalidateQueries({ queryKey: ["messages", activeChatId] });
    }
  }, [queryClient]);

  const connect = useCallback(() => {
    if (!token) return;

    const wsUrl = new URL(url);
    wsUrl.searchParams.append("token", token);

    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Details: WS Connected");
      setIsConnected(true);

      if (!isFirstConnectionRef.current) {
        handleReconnect();
      }
      isFirstConnectionRef.current = false;

      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Details: WS Event:", data.type, data);

        const currentUser = useAuthStore.getState().user;

        switch (data.type) {
          case "message.new": {
            const payload = data.payload as Message;

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<Message>>>(
              { queryKey: ["messages", payload.chat_id] },
              (oldData) => {
                if (!oldData) return oldData;

                const newPages = [...oldData.pages];
                if (newPages.length > 0) {
                  const firstPage = newPages[0];
                  const currentData = firstPage.data || [];

                  if (currentData.some((m: Message) => m.id === payload.id)) {
                    return oldData;
                  }

                  newPages[0] = {
                    ...firstPage,
                    data: [...currentData, payload],
                  };
                }
                return { ...oldData, pages: newPages };
              }
            );

            const allChatsCaches = queryClient.getQueriesData<
              InfiniteData<PaginatedResponse<ChatListItem>>
            >({ queryKey: ["chats"] });

            const chatExists = allChatsCaches.some(([, cache]) =>
              cache?.pages.some((page) =>
                page.data.some((c: ChatListItem) => c.id === payload.chat_id)
              )
            );

            if (!chatExists) {
              chatService
                .getChatById(payload.chat_id)
                .then((newChat) => {
                  queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                    { queryKey: ["chats"] },
                    (oldData) => {
                      if (!oldData) return oldData;
                      const newPages = [...oldData.pages];
                      if (newPages.length > 0) {
                        if (newPages[0].data.some((c: ChatListItem) => c.id === newChat.id))
                          return oldData;

                        newPages[0] = {
                          ...newPages[0],
                          data: [newChat, ...newPages[0].data],
                        };
                      }
                      return { ...oldData, pages: newPages };
                    }
                  );
                })
                .catch((err) => console.error("Failed to fetch chat details", err));
            }

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;

                let targetChat: ChatListItem | undefined;

                for (const page of oldData.pages) {
                  const found = page.data.find((c) => c.id === payload.chat_id);
                  if (found) {
                    targetChat = found;
                    break;
                  }
                }

                if (!targetChat) {
                  return oldData;
                }

                const updatedChat: ChatListItem = {
                  ...targetChat,
                  last_message: payload,
                  unread_count:
                    payload.sender_id !== currentUser?.id
                      ? (targetChat.unread_count || 0) + 1
                      : targetChat.unread_count,
                };

                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((c) => c.id !== payload.chat_id),
                }));

                if (newPages.length > 0) {
                  newPages[0] = {
                    ...newPages[0],
                    data: [updatedChat, ...newPages[0].data],
                  };
                }

                return { ...oldData, pages: newPages };
              }
            );

            queryClient.setQueryData<ChatListItem>(["chat", payload.chat_id], (oldChat) => {
              if (!oldChat) return oldChat;
              return {
                ...oldChat,
                last_message: payload,
                unread_count:
                  payload.sender_id !== currentUser?.id
                    ? (oldChat.unread_count || 0) + 1
                    : oldChat.unread_count,
              };
            });

            if (payload.chat_id && payload.sender_id) {
              setUserTyping(payload.chat_id, payload.sender_id, false);
              const key = `${payload.chat_id}-${payload.sender_id}`;
              if (typingTimeoutsRef.current[key]) {
                clearTimeout(typingTimeoutsRef.current[key]);
                delete typingTimeoutsRef.current[key];
              }
            }
            break;
          }

          case "message.update": {
            const payload = data.payload as Message;
            queryClient.setQueriesData<InfiniteData<PaginatedResponse<Message>>>(
              { queryKey: ["messages", payload.chat_id] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((m: Message) => {
                    if (m.id === payload.id) {
                      return { ...m, ...payload };
                    }
                    return m;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );
            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((chat: ChatListItem) => {
                    if (chat.last_message?.id === payload.id) {
                      return { ...chat, last_message: { ...chat.last_message, ...payload } };
                    }
                    return chat;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );

            if (payload.chat_id && payload.sender_id) {
              setUserTyping(payload.chat_id, payload.sender_id, false);
              const key = `${payload.chat_id}-${payload.sender_id}`;
              if (typingTimeoutsRef.current[key]) {
                clearTimeout(typingTimeoutsRef.current[key]);
                delete typingTimeoutsRef.current[key];
              }
            }
            break;
          }

          case "chat.hide":
          case "chat.delete": {
            const { chat_id } = data.payload as { chat_id: string };
            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((chat: ChatListItem) => chat.id !== chat_id),
                }));
                return { ...oldData, pages: newPages };
              }
            );
            break;
          }

          case "user.banned":
          case "user.deleted": {
            const { user_id } = data.payload as { user_id: string };
            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((chat: ChatListItem) => {
                    if (chat.type === "private" && chat.other_user_id === user_id) {
                      return {
                        ...chat,
                        other_user_is_banned: data.type === "user.banned",
                        other_user_is_deleted: data.type === "user.deleted",
                        is_online: false,
                      };
                    }
                    return chat;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );
            queryClient.invalidateQueries({ queryKey: ["user", user_id] });
            break;
          }

          case "message.delete": {
            const { message_id } = data.payload as { message_id: string };
            const timestamp = data.meta?.timestamp || Date.now();
            const deletedAt = new Date(timestamp).toISOString();

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<Message>>>(
              { queryKey: ["messages"] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((m: Message) => {
                    if (m.id === message_id) {
                      return {
                        ...m,
                        deleted_at: deletedAt,
                        content: null,
                        attachments: [],
                        reply_to: null,
                      };
                    }

                    if (m.reply_to?.id === message_id) {
                      return {
                        ...m,
                        reply_to: {
                          ...m.reply_to,
                          deleted_at: deletedAt,
                          content: null,
                          attachments: [],
                        },
                      };
                    }

                    return m;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((chat: ChatListItem) => {
                    if (chat.last_message?.id === message_id) {
                      return {
                        ...chat,
                        last_message: {
                          ...chat.last_message,
                          deleted_at: deletedAt,
                          content: null,
                          attachments: [],
                        },
                      };
                    }
                    return chat;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );
            break;
          }

          case "chat.new": {
            const payload = data.payload as ChatListItem;
            const newChat: ChatListItem = {
              id: payload.id,
              type: payload.type,
              name: payload.name,
              avatar: payload.avatar || null,
              unread_count: payload.unread_count || 0,
              is_pinned: payload.is_pinned || false,
              last_read_at: payload.last_read_at || null,
              other_last_read_at: payload.other_last_read_at || null,
              other_user_id: payload.other_user_id,
              is_blocked_by_me: payload.is_blocked_by_me,
              is_blocked_by_other: payload.is_blocked_by_other,
              last_message: payload.last_message || null,
              is_online: payload.is_online,
            };

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;

                const newPages = [...oldData.pages];
                if (newPages.length > 0) {
                  newPages[0] = {
                    ...newPages[0],
                    data: [newChat, ...newPages[0].data],
                  };
                }
                return { ...oldData, pages: newPages };
              }
            );
            break;
          }

          case "user.online":
          case "user.offline": {
            const { user_id } = data.payload as { user_id: string };
            const isOnline = data.type === "user.online";

            setUserOnline(user_id, isOnline);

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((chat: ChatListItem) => {
                    if (chat.type === "private" && chat.other_user_id === user_id) {
                      return { ...chat, is_online: isOnline };
                    }
                    return chat;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );

            queryClient.setQueriesData<User>({ queryKey: ["user", user_id] }, (oldUser) => {
              if (!oldUser) return oldUser;
              return { ...oldUser, is_online: isOnline, last_seen_at: new Date().toISOString() };
            });
            break;
          }

          case "chat.read": {
            const payload = data.payload as { chat_id: string; user_id: string };

            if (payload.user_id !== currentUser?.id) {
              const now = new Date().toISOString();

              queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                { queryKey: ["chats"] },
                (oldData) => {
                  if (!oldData) return oldData;
                  return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                      ...page,
                      data: page.data.map((chat) => {
                        if (chat.id === payload.chat_id) {
                          return {
                            ...chat,
                            other_last_read_at: now,
                          };
                        }
                        return chat;
                      }),
                    })),
                  };
                }
              );

              queryClient.setQueryData<ChatListItem>(["chat", payload.chat_id], (oldChat) => {
                if (!oldChat) return oldChat;
                return {
                  ...oldChat,
                  other_last_read_at: now,
                };
              });
            }
            break;
          }

          case "user.update": {
            const payload = data.payload as UserUpdateEventPayload;
            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((chat: ChatListItem) => {
                    if (chat.type === "private" && chat.other_user_id === payload.id) {
                      return {
                        ...chat,
                        name: payload.full_name,
                        avatar: payload.avatar,
                      };
                    }
                    return chat;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );

            queryClient.setQueriesData<User>({ queryKey: ["user", payload.id] }, (oldUser) => {
              if (!oldUser) return oldUser;
              return {
                ...oldUser,
                ...payload,
              };
            });
            break;
          }

          case "user.block": {
            const { blocker_id } = data.payload as { blocker_id: string };

            setUserOnline(blocker_id, false);
            clearUserTypingGlobal(blocker_id);

            userService
              .getUserById(blocker_id)
              .then((freshUser: User) => {
                queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                  { queryKey: ["chats"] },
                  (oldData) => {
                    if (!oldData) return oldData;
                    const newPages = oldData.pages.map((page) => ({
                      ...page,
                      data: page.data.map((chat: ChatListItem) => {
                        if (chat.type === "private" && chat.other_user_id === blocker_id) {
                          return {
                            ...chat,
                            is_blocked_by_other: true,
                            is_online: freshUser.is_online,
                          };
                        }
                        return chat;
                      }),
                    }));
                    return { ...oldData, pages: newPages };
                  }
                );

                queryClient.setQueriesData<User>({ queryKey: ["user", blocker_id] }, freshUser);
              })
              .catch((err: unknown) => {
                console.error("Failed to sync block data", err);

                queryClient.invalidateQueries({ queryKey: ["chats"] });
                queryClient.invalidateQueries({ queryKey: ["user", blocker_id] });
              });
            break;
          }

          case "user.unblock": {
            const { blocker_id } = data.payload as { blocker_id: string };

            clearUserTypingGlobal(blocker_id);

            userService
              .getUserById(blocker_id)
              .then((freshUser: User) => {
                queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                  { queryKey: ["chats"] },
                  (oldData) => {
                    if (!oldData) return oldData;
                    const newPages = oldData.pages.map((page) => ({
                      ...page,
                      data: page.data.map((chat: ChatListItem) => {
                        if (chat.type === "private" && chat.other_user_id === blocker_id) {
                          return {
                            ...chat,
                            is_blocked_by_other: false,
                            is_online: freshUser.is_online,
                          };
                        }
                        return chat;
                      }),
                    }));
                    return { ...oldData, pages: newPages };
                  }
                );

                queryClient.setQueriesData<User>({ queryKey: ["user", blocker_id] }, freshUser);
              })
              .catch((err: unknown) => {
                console.error("Failed to sync unblock data", err);

                queryClient.invalidateQueries({ queryKey: ["chats"] });
                queryClient.invalidateQueries({ queryKey: ["user", blocker_id] });
              });

            break;
          }

          case "chat.typing": {
            const chatId = data.meta?.chat_id || data.payload?.chat_id;
            const senderId =
              data.meta?.sender_id || data.payload?.sender_id || data.payload?.user_id;

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
            break;
          }
        }
      } catch (err) {
        console.error("WS Error:", err);
      }
    };

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
  }, [
    url,
    token,
    queryClient,
    setUserTyping,
    setUserOnline,
    clearUserTypingGlobal,
    handleReconnect,
  ]);

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
      }
    };
  }, [token, connect]);

  const sendTyping = useCallback((chatId: string) => {
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
  }, []);

  return { sendTyping, isConnected };
};
