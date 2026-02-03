import { chatService } from "@/services/chat.service";
import { userService } from "@/services/user.service";
import { useAuthStore, useChatStore } from "@/store";
import {
  ChatListItem,
  GroupMember,
  Message,
  PaginatedResponse,
  User,
  UserUpdateEventPayload,
} from "@/types";
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
  const memberInvalidationTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

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

        if (data.type === "chat.delete") {
          console.log("Explicit IF match for chat.delete!");
        } else if (data.type.trim() === "chat.delete") {
          console.warn("Match with TRIM only! Hidden characters present.");
        }

        if (data.type === "chat.delete") {
          const payload = data.payload as { chat_id?: string; id?: string };
          const chatId =
            payload.chat_id ||
            payload.id ||
            ((data.payload as Record<string, unknown>)?.chat_id as string | undefined);

          if (chatId) {
            console.log("FORCE HANDLING chat.delete for:", chatId);
            const activeChatId = useChatStore.getState().activeChatId;
            const isActive = activeChatId === chatId;
            console.log("Force handle active check:", isActive);

            window.dispatchEvent(new CustomEvent("kicked-from-chat", { detail: { chatId } }));
          }
        }

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

            if (payload.type.startsWith("system_") && payload.action_data) {
              const actionData = payload.action_data as {
                target_id?: string;
                new_role?: "owner" | "admin" | "member";
                actor_id?: string;
              };
              const { target_id, new_role, actor_id } = actionData;

              if (
                payload.type === "system_promote" ||
                payload.type === "system_demote" ||
                payload.type === "system_transfer"
              ) {
                queryClient.setQueriesData<InfiniteData<PaginatedResponse<GroupMember>>>(
                  { queryKey: ["group-members", "infinite", payload.chat_id] },
                  (oldData) => {
                    if (!oldData) return oldData;
                    const newPages = oldData.pages.map((page) => ({
                      ...page,
                      data: page.data.map((m) => {
                        if (m.user_id === target_id && new_role) {
                          return { ...m, role: new_role };
                        }

                        if (payload.type === "system_transfer" || new_role === "owner") {
                          const oldOwnerId = actor_id || payload.sender_id;
                          if (m.user_id === oldOwnerId) {
                            return { ...m, role: "admin" as const };
                          }
                        }

                        return m;
                      }),
                    }));
                    return { ...oldData, pages: newPages };
                  }
                );

                const oldOwnerId = actor_id || payload.sender_id;
                const amITarget = target_id === currentUser?.id;
                const amIOldOwner =
                  (payload.type === "system_transfer" || new_role === "owner") &&
                  oldOwnerId === currentUser?.id;

                if (amITarget || amIOldOwner) {
                  const myNewRole = amITarget ? new_role : ("admin" as const);

                  queryClient.setQueryData<ChatListItem>(["chat", payload.chat_id], (oldChat) => {
                    if (!oldChat) return oldChat;
                    return { ...oldChat, my_role: myNewRole };
                  });

                  queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                    { queryKey: ["chats"] },
                    (oldData) => {
                      if (!oldData) return oldData;
                      const newPages = oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.map((chat) => {
                          if (chat.id === payload.chat_id) {
                            return { ...chat, my_role: myNewRole };
                          }
                          return chat;
                        }),
                      }));
                      return { ...oldData, pages: newPages };
                    }
                  );
                }
              }

              if (payload.type === "system_kick" || payload.type === "system_leave") {
                const removedUserId = target_id || payload.sender_id;
                const backendMemberCount = (payload as Message & { member_count?: number })
                  .member_count;

                const amIKicked =
                  payload.type === "system_kick" && removedUserId === currentUser?.id;

                if (amIKicked) {
                  import("sonner").then(({ toast }) => {
                    toast.error("You have been removed from the group", {
                      id: `kicked-${payload.chat_id}`,
                    });
                  });

                  queryClient.cancelQueries({ queryKey: ["chat", payload.chat_id] });
                  queryClient.cancelQueries({ queryKey: ["messages", payload.chat_id] });

                  queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                    { queryKey: ["chats"] },
                    (oldData) => {
                      if (!oldData) return oldData;
                      const newPages = oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.filter((chat) => chat.id !== payload.chat_id),
                      }));
                      return { ...oldData, pages: newPages };
                    }
                  );

                  queryClient.removeQueries({ queryKey: ["chat", payload.chat_id] });
                  queryClient.removeQueries({ queryKey: ["messages", payload.chat_id] });
                  queryClient.removeQueries({
                    queryKey: ["group-members", "infinite", payload.chat_id],
                  });

                  queryClient.invalidateQueries({ queryKey: ["chats"], refetchType: "none" });

                  window.dispatchEvent(
                    new CustomEvent("kicked-from-chat", { detail: { chatId: payload.chat_id } })
                  );

                  return;
                } else {
                  queryClient.setQueriesData<InfiniteData<PaginatedResponse<GroupMember>>>(
                    { queryKey: ["group-members", "infinite", payload.chat_id] },
                    (oldData) => {
                      if (!oldData) return oldData;
                      const newPages = oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.filter((m) => m.user_id !== removedUserId),
                      }));
                      return { ...oldData, pages: newPages };
                    }
                  );

                  queryClient.setQueryData<ChatListItem>(["chat", payload.chat_id], (oldChat) => {
                    if (!oldChat) return oldChat;
                    const newCount =
                      typeof backendMemberCount === "number"
                        ? backendMemberCount
                        : Math.max(0, (oldChat.member_count || 0) - 1);
                    return { ...oldChat, member_count: newCount };
                  });

                  queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                    { queryKey: ["chats"] },
                    (oldData) => {
                      if (!oldData) return oldData;
                      const newPages = oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.map((chat) => {
                          if (chat.id === payload.chat_id) {
                            const newCount =
                              typeof backendMemberCount === "number"
                                ? backendMemberCount
                                : Math.max(0, (chat.member_count || 0) - 1);
                            return { ...chat, member_count: newCount };
                          }
                          return chat;
                        }),
                      }));
                      return { ...oldData, pages: newPages };
                    }
                  );
                }
              }

              if (payload.type === "system_rename") {
                const actionData = payload.action_data as { new_name?: string };
                if (actionData.new_name) {
                  queryClient.setQueryData<ChatListItem>(["chat", payload.chat_id], (oldChat) => {
                    if (!oldChat) return oldChat;
                    return { ...oldChat, name: actionData.new_name! };
                  });

                  queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                    { queryKey: ["chats"] },
                    (oldData) => {
                      if (!oldData) return oldData;
                      const newPages = oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.map((chat) => {
                          if (chat.id === payload.chat_id) {
                            return { ...chat, name: actionData.new_name! };
                          }
                          return chat;
                        }),
                      }));
                      return { ...oldData, pages: newPages };
                    }
                  );
                }
              }

              if (payload.type === "system_visibility") {
                const actionData = payload.action_data as {
                  new_visibility?: "public" | "private";
                  invite_code?: string;
                  invite_expires_at?: string;
                };
                const isPublic = actionData.new_visibility === "public";

                queryClient.setQueryData<ChatListItem>(["chat", payload.chat_id], (oldChat) => {
                  if (!oldChat) return oldChat;
                  return {
                    ...oldChat,
                    is_public: isPublic,
                    invite_code: actionData.invite_code || oldChat.invite_code,
                    invite_expires_at: actionData.invite_expires_at || oldChat.invite_expires_at,
                  };
                });

                queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                  { queryKey: ["chats"] },
                  (oldData) => {
                    if (!oldData) return oldData;
                    const newPages = oldData.pages.map((page) => ({
                      ...page,
                      data: page.data.map((chat) => {
                        if (chat.id === payload.chat_id) {
                          return {
                            ...chat,
                            is_public: isPublic,
                            invite_code: actionData.invite_code || chat.invite_code,
                            invite_expires_at:
                              actionData.invite_expires_at || chat.invite_expires_at,
                          };
                        }
                        return chat;
                      }),
                    }));
                    return { ...oldData, pages: newPages };
                  }
                );
              }

              if (payload.type === "system_description" || payload.type === "system_avatar") {
                queryClient.invalidateQueries({ queryKey: ["chat", payload.chat_id] });
                if (payload.type === "system_avatar") {
                  queryClient.invalidateQueries({ queryKey: ["chats"] });
                }
              }

              if (payload.type === "system_add") {
                const backendMemberCount = (payload as Message & { member_count?: number })
                  .member_count;

                if (memberInvalidationTimeoutsRef.current[payload.chat_id]) {
                  clearTimeout(memberInvalidationTimeoutsRef.current[payload.chat_id]);
                }

                memberInvalidationTimeoutsRef.current[payload.chat_id] = setTimeout(() => {
                  queryClient.invalidateQueries({
                    queryKey: ["group-members", "infinite", payload.chat_id],
                  });
                  delete memberInvalidationTimeoutsRef.current[payload.chat_id];
                }, 1000);

                queryClient.setQueryData<ChatListItem>(["chat", payload.chat_id], (oldChat) => {
                  if (!oldChat) return oldChat;
                  const newCount =
                    typeof backendMemberCount === "number"
                      ? backendMemberCount
                      : (oldChat.member_count || 0) + 1;
                  return { ...oldChat, member_count: newCount };
                });

                queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                  { queryKey: ["chats"] },
                  (oldData) => {
                    if (!oldData) return oldData;
                    const newPages = oldData.pages.map((page) => ({
                      ...page,
                      data: page.data.map((chat) => {
                        if (chat.id === payload.chat_id) {
                          const newCount =
                            typeof backendMemberCount === "number"
                              ? backendMemberCount
                              : (chat.member_count || 0) + 1;
                          return { ...chat, member_count: newCount };
                        }
                        return chat;
                      }),
                    }));
                    return { ...oldData, pages: newPages };
                  }
                );
              }
            }

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

          case "chat.hide": {
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
                      queryClient.setQueryData<ChatListItem>(["chat", chat.id], (oldChat) => {
                        if (!oldChat) return oldChat;
                        return {
                          ...oldChat,
                          other_user_is_banned: data.type === "user.banned",
                          other_user_is_deleted: data.type === "user.deleted",
                          is_online: false,
                        };
                      });

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
              my_role: payload.my_role,
              description: payload.description,
              is_public: payload.is_public,
              member_count: payload.member_count,
              invite_code: payload.invite_code,
              invite_expires_at: payload.invite_expires_at,
            };

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;

                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((c) => c.id !== payload.id),
                }));

                if (newPages.length > 0) {
                  newPages[0] = {
                    ...newPages[0],
                    data: [newChat, ...newPages[0].data],
                  };
                }
                return { ...oldData, pages: newPages };
              }
            );

            queryClient.setQueryData<ChatListItem>(["chat", payload.id], (oldChat) => {
              if (oldChat) {
                const merged = { ...oldChat };

                if (payload.invite_code !== undefined) merged.invite_code = payload.invite_code;
                if (payload.invite_expires_at !== undefined)
                  merged.invite_expires_at = payload.invite_expires_at;

                if (payload.name) merged.name = payload.name;
                if (payload.avatar !== undefined) merged.avatar = payload.avatar;
                if (payload.description !== undefined) merged.description = payload.description;
                if (payload.member_count !== undefined) merged.member_count = payload.member_count;
                if (payload.my_role !== undefined) merged.my_role = payload.my_role;

                return merged;
              }
              return newChat;
            });
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

          case "group.member_add": {
            const { group_id, member, member_count } = data.payload as {
              group_id: string;
              member: GroupMember;
              member_count: number;
            };

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<GroupMember>>>(
              { queryKey: ["group-members", "infinite", group_id] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = [...oldData.pages];
                const lastPageIndex = newPages.length - 1;
                if (lastPageIndex >= 0) {
                  const lastPage = newPages[lastPageIndex];
                  if (!lastPage.data.some((m) => m.id === member.id)) {
                    newPages[lastPageIndex] = {
                      ...lastPage,
                      data: [...lastPage.data, member],
                    };
                  }
                }
                return { ...oldData, pages: newPages };
              }
            );

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((chat) => {
                    if (chat.id === group_id) {
                      return { ...chat, member_count };
                    }
                    return chat;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );

            queryClient.setQueryData<ChatListItem>(["chat", group_id], (oldChat) => {
              if (!oldChat) return oldChat;
              return { ...oldChat, member_count };
            });
            break;
          }

          case "group.member_remove": {
            const { group_id, user_id, member_count } = data.payload as {
              group_id: string;
              user_id: string;
              member_count: number;
            };

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<GroupMember>>>(
              { queryKey: ["group-members", "infinite", group_id] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((m) => m.user_id !== user_id),
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
                  data: page.data.map((chat) => {
                    if (chat.id === group_id) {
                      return { ...chat, member_count };
                    }
                    return chat;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );

            queryClient.setQueryData<ChatListItem>(["chat", group_id], (oldChat) => {
              if (!oldChat) return oldChat;
              return { ...oldChat, member_count };
            });

            if (user_id === currentUser?.id) {
              queryClient.invalidateQueries({ queryKey: ["chats"] });
            }
            break;
          }

          case "group.role_update": {
            const { group_id, user_id, role } = data.payload as {
              group_id: string;
              user_id: string;
              role: "owner" | "admin" | "member";
            };

            console.log("DEBUG: group.role_update RECEIVED", {
              group_id,
              user_id,
              role,
              currentUserId: currentUser?.id,
            });

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<GroupMember>>>(
              { queryKey: ["group-members", "infinite", group_id] },
              (oldData) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map((m) => {
                    if (m.user_id === user_id) {
                      return { ...m, role };
                    }
                    return m;
                  }),
                }));
                return { ...oldData, pages: newPages };
              }
            );

            if (user_id === currentUser?.id) {
              queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
                { queryKey: ["chats"] },
                (oldData) => {
                  if (!oldData) return oldData;
                  const newPages = oldData.pages.map((page) => ({
                    ...page,
                    data: page.data.map((chat) => {
                      if (chat.id === group_id) {
                        return { ...chat, my_role: role };
                      }
                      return chat;
                    }),
                  }));
                  return { ...oldData, pages: newPages };
                }
              );

              queryClient.setQueryData<ChatListItem>(["chat", group_id], (oldChat) => {
                if (!oldChat) return oldChat;
                return { ...oldChat, my_role: role };
              });
            }
            break;
          }

          case "chat.delete": {
            console.log("chat.delete RAW event:", data);

            const payload = data.payload as { chat_id?: string; id?: string };
            const chatId =
              payload.chat_id ||
              payload.id ||
              ((data.payload as Record<string, unknown>)?.chat_id as string | undefined);

            console.log("chat.delete event received:", { chatId, payload });

            if (!chatId) {
              console.error("chat.delete: No chat_id found in payload", data);
              break;
            }

            import("sonner").then(({ toast }) => {
              toast.error("You have been removed from the group", {
                id: `chat-deleted-${chatId}`,
              });
            });

            if (!chatId) {
              console.error("chat.delete: No chat_id found in payload", data);
              break;
            }

            console.log("chat.delete: Processing removal for:", chatId);

            const activeChatId = useChatStore.getState().activeChatId;
            const isActive = activeChatId === chatId;
            console.log("chat.delete: Is active chat?", isActive, { activeChatId, chatId });

            window.dispatchEvent(new CustomEvent("kicked-from-chat", { detail: { chatId } }));

            import("sonner").then(({ toast }) => {
              console.log("chat.delete: Showing toast");
              toast.error("You have been removed from the group", {
                id: `chat-deleted-${chatId}`,
              });
            });

            queryClient.cancelQueries({ queryKey: ["chat", chatId] });
            queryClient.cancelQueries({ queryKey: ["messages", chatId] });

            queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
              { queryKey: ["chats"] },
              (oldData) => {
                if (!oldData) return oldData;
                console.log("chat.delete: Filtering chats, removing:", chatId);
                const newPages = oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((chat) => chat.id !== chatId),
                }));
                return { ...oldData, pages: newPages };
              }
            );

            queryClient.removeQueries({ queryKey: ["chat", chatId] });
            queryClient.removeQueries({ queryKey: ["messages", chatId] });
            queryClient.removeQueries({ queryKey: ["group-members", "infinite", chatId] });

            queryClient.invalidateQueries({ queryKey: ["chats"], refetchType: "none" });

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
