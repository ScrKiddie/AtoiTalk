import { userService } from "@/services/user.service";
import { useAuthStore } from "@/store";
import {
  ChatListItem,
  GroupMember,
  PaginatedResponse,
  User,
  UserUpdateEventPayload,
} from "@/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export const useUserEvents = (
  currentUser: User | null,
  setUserOnline: (userId: string, isOnline: boolean) => void,
  clearUserTypingGlobal: (userId: string) => void
) => {
  const queryClient = useQueryClient();

  const handleUserOnlineStatus = useCallback(
    (payload: { user_id: string }, isOnline: boolean) => {
      const { user_id } = payload;

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
    },
    [queryClient, setUserOnline]
  );

  const handleUserUpdate = useCallback(
    (payload: UserUpdateEventPayload) => {
      queryClient.setQueryData<User>(["user", payload.id], (oldUser) => {
        if (!oldUser) return undefined;
        return {
          ...oldUser,
          ...payload,
        };
      });

      if (currentUser && currentUser.id === payload.id) {
        queryClient.setQueryData<User>(["user", "current"], (oldUser) => {
          if (!oldUser) return oldUser;
          return {
            ...oldUser,
            ...payload,
          };
        });
      }

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
                  name: payload.full_name !== undefined ? payload.full_name : chat.name,
                  avatar: payload.avatar !== undefined ? payload.avatar : chat.avatar,
                };
              }
              return chat;
            }),
          }));
          return { ...oldData, pages: newPages };
        }
      );

      queryClient.setQueriesData<ChatListItem>({ queryKey: ["chat"] }, (oldChat) => {
        if (!oldChat) return oldChat;

        if (oldChat.type === "private" && oldChat.other_user_id === payload.id) {
          return {
            ...oldChat,
            name: payload.full_name !== undefined ? payload.full_name : oldChat.name,
            avatar: payload.avatar !== undefined ? payload.avatar : oldChat.avatar,
            is_online:
              payload.last_seen_at !== undefined ? !!payload.last_seen_at : oldChat.is_online,
          };
        }
        return oldChat;
      });

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<GroupMember>>>(
        { queryKey: ["group-members"] },
        (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((member) => {
              if (member.user_id === payload.id) {
                return {
                  ...member,
                  full_name: payload.full_name !== undefined ? payload.full_name : member.full_name,
                  avatar: payload.avatar !== undefined ? payload.avatar : member.avatar,
                  username: payload.username !== undefined ? payload.username : member.username,
                };
              }
              return member;
            }),
          }));
          return { ...oldData, pages: newPages };
        }
      );

      if (currentUser && currentUser.id === payload.id) {
        useAuthStore.getState().setUser({
          ...currentUser,
          ...payload,
        });
      }
    },
    [currentUser, queryClient]
  );

  const handleUserBlock = useCallback(
    (payload: { blocker_id: string }) => {
      const { blocker_id } = payload;

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
    },
    [clearUserTypingGlobal, queryClient, setUserOnline]
  );

  const handleUserUnblock = useCallback(
    (payload: { blocker_id: string }) => {
      const { blocker_id } = payload;

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
    },
    [clearUserTypingGlobal, queryClient]
  );

  const handleUserBanDelete = useCallback(
    (data: { type: string; payload: unknown }) => {
      const { user_id } = data.payload as { user_id: string; reason?: string };

      if (data.type === "user.banned" && user_id === currentUser?.id) {
        window.dispatchEvent(
          new CustomEvent("user-banned", {
            detail: { reason: (data.payload as { reason?: string }).reason },
          })
        );
      }

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
    },
    [currentUser, queryClient]
  );

  const handleUserUnbanned = useCallback(
    (data: { payload: unknown }) => {
      const { user_id } = data.payload as { user_id: string };

      if (user_id === currentUser?.id) {
        window.dispatchEvent(new CustomEvent("user-unbanned"));
      }

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
                    other_user_is_banned: false,
                  };
                });

                return {
                  ...chat,
                  other_user_is_banned: false,
                };
              }
              return chat;
            }),
          }));
          return { ...oldData, pages: newPages };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["user", user_id] });
    },
    [currentUser, queryClient]
  );

  return {
    handleUserOnlineStatus,
    handleUserUpdate,
    handleUserBlock,
    handleUserUnblock,
    handleUserBanDelete,
    handleUserUnbanned,
  };
};
