import { messageService } from "@/services";
import type {
  ChatListItem,
  GetMessagesParams,
  Message,
  PaginatedResponse,
  SendMessageRequest,
} from "@/types";
import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export function useMessages(
  chatId: string | null,
  params?: GetMessagesParams & { anchorId?: string },
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: ["messages", chatId, params?.anchorId],
    queryFn: ({ pageParam, direction, signal }) => {
      const { anchorId, ...apiParams } = params || {};

      const finalParams: GetMessagesParams = {
        ...apiParams,
        limit: params?.limit ?? 30,
      };

      if (pageParam) {
        finalParams.cursor = pageParam as string;

        if (direction === "backward") {
          finalParams.direction = "newer";
        }
      } else if (anchorId) {
        finalParams.around_message_id = anchorId;
      }

      return messageService.getMessages(chatId!, finalParams, signal);
    },
    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) =>
      lastPage.meta.has_next ? lastPage.meta.next_cursor : undefined,

    getPreviousPageParam: (firstPage) =>
      firstPage.meta.has_prev ? firstPage.meta.prev_cursor : undefined,
    enabled: chatId !== null && (options?.enabled ?? true),
    retry: (failureCount, error) => {
      const axiosError = error as AxiosError;
      if (axiosError?.response?.status === 403) return false;
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageRequest) => messageService.sendMessage(data),
    onSuccess: (newMessage) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Message>>>(
        { queryKey: ["messages", newMessage.chat_id] },
        (oldData) => {
          if (!oldData) return oldData;
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            const firstPage = newPages[0];
            if (firstPage.data.some((m) => m.id === newMessage.id)) return oldData;
            newPages[0] = {
              ...firstPage,
              data: [...firstPage.data, newMessage],
            };
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
              if (chat.id === newMessage.chat_id) {
                return {
                  ...chat,
                  last_message: newMessage,
                };
              }
              return chat;
            }),
          }));
          return { ...oldData, pages: newPages };
        }
      );

      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId }: { messageId: string; chatId: string }) =>
      messageService.deleteMessage(messageId),
    onMutate: async ({ messageId, chatId }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", chatId] });

      const previousMessages = queryClient.getQueryData<InfiniteData<PaginatedResponse<Message>>>([
        "messages",
        chatId,
      ]);

      queryClient.setQueryData<InfiniteData<PaginatedResponse<Message>>>(
        ["messages", chatId],
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            data: page.data.map((msg) =>
              msg.id === messageId ? { ...msg, deleted_at: new Date().toISOString() } : msg
            ),
          }));
          return { ...old, pages: newPages };
        }
      );

      return { previousMessages };
    },
    onError: (_error, { chatId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", chatId], context.previousMessages);
      }
    },
  });
}
