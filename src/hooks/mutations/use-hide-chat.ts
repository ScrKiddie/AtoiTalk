import chatService from "@/services/chat.service";
import { ApiError, ChatListItem, PaginatedResponse } from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

export const useHideChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatService.hideChat(chatId),
    onSuccess: (_data, chatId) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            data: page.data.filter((chat) => chat.id !== chatId),
          }));
          return { ...oldData, pages: newPages };
        }
      );

      queryClient.removeQueries({ queryKey: ["messages", chatId] });

      queryClient.invalidateQueries({ queryKey: ["chats"] });

      toast.success("Chat deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to hide chat:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to delete chat");
    },
  });
};
