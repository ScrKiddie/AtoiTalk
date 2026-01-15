import { toast } from "@/lib/toast";
import { userService } from "@/services/user.service";
import { useChatStore } from "@/store";
import { ApiError, ChatListItem, PaginatedResponse, User } from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useBlockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.blockUser(userId),
    onSuccess: (_, userId) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((chat: ChatListItem) => {
              if (chat.type === "private" && chat.other_user_id === userId) {
                return {
                  ...chat,
                  is_blocked_by_me: true,
                  is_online: false,
                };
              }
              return chat;
            }),
          }));
          return { ...oldData, pages: newPages };
        }
      );

      queryClient.setQueryData<User>(["user", userId], (oldUser) => {
        if (!oldUser) return oldUser;
        return { ...oldUser, is_blocked_by_me: true, is_online: false };
      });

      queryClient.invalidateQueries({ queryKey: ["user", userId] });

      queryClient.invalidateQueries({ queryKey: ["users", "search"] });
      toast.success("User blocked successfully");
    },
    onError: (error) => {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to block user");
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.unblockUser(userId),
    onSuccess: async (_, userId) => {
      useChatStore.getState().clearUserTypingGlobal(userId);

      try {
        const freshUser = await userService.getUserById(userId);

        queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
          { queryKey: ["chats"] },
          (oldData) => {
            if (!oldData) return oldData;
            const newPages = oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((chat: ChatListItem) => {
                if (chat.type === "private" && chat.other_user_id === userId) {
                  return {
                    ...chat,
                    is_blocked_by_me: false,
                    is_online: freshUser.is_online,
                  };
                }
                return chat;
              }),
            }));
            return { ...oldData, pages: newPages };
          }
        );

        queryClient.setQueryData<User>(["user", userId], freshUser);
      } catch (err) {
        console.error("Failed to fetch fresh user data after unblock", err);

        queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
          { queryKey: ["chats"] },
          (oldData) => {
            if (!oldData) return oldData;
            const newPages = oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((chat: ChatListItem) => {
                if (chat.type === "private" && chat.other_user_id === userId) {
                  return { ...chat, is_blocked_by_me: false };
                }
                return chat;
              }),
            }));
            return { ...oldData, pages: newPages };
          }
        );
        queryClient.invalidateQueries({ queryKey: ["user", userId] });
      }

      queryClient.invalidateQueries({ queryKey: ["users", "blocked"] });
      queryClient.invalidateQueries({ queryKey: ["users", "search"] });
      toast.success("User unblocked successfully");
    },
    onError: (error) => {
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to unblock user");
    },
  });
};
