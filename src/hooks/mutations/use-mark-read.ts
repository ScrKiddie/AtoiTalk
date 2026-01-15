import { chatService } from "@/services/chat.service";
import { ChatListItem, PaginatedResponse } from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatService.markAsRead(chatId),
    onSuccess: (_data, chatId) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((chat) =>
                chat.id === chatId ? { ...chat, unread_count: 0 } : chat
              ),
            })),
          };
        }
      );
    },
  });
};
