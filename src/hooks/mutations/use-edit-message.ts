import { toast } from "@/lib/toast";
import { messageService } from "@/services/message.service";
import { ApiError, EditMessageRequest, Media, Message, PaginatedResponse } from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

interface EditMessageVariables {
  messageId: string;
  chatId: string;
  data: EditMessageRequest;
  optimisticAttachments: Media[];
}

type CacheEntry = [readonly unknown[], InfiniteData<PaginatedResponse<Message>> | undefined];

export const useEditMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Message,
    AxiosError<ApiError>,
    EditMessageVariables,
    { previousCaches: CacheEntry[] }
  >({
    mutationFn: ({ messageId, data }) => messageService.editMessage(messageId, data),
    onMutate: async ({ messageId, chatId, data, optimisticAttachments }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", chatId] });

      const previousCaches = queryClient.getQueriesData<InfiniteData<PaginatedResponse<Message>>>({
        queryKey: ["messages", chatId],
      });

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Message>>>(
        { queryKey: ["messages", chatId] },
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            data: page.data.map((msg) => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  content: data.content !== undefined ? data.content : msg.content,
                  attachments: optimisticAttachments,
                  edited_at: new Date().toISOString(),
                };
              }
              return msg;
            }),
          }));
          return { ...old, pages: newPages };
        }
      );

      return { previousCaches };
    },
    onError: (error, _variables, context) => {
      if (context?.previousCaches) {
        context.previousCaches.forEach(([queryKey, data]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
      toast.error(error.response?.data?.error || "Failed to edit message");
    },
    onSuccess: (updatedMessage, { chatId }) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Message>>>(
        { queryKey: ["messages", chatId] },
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            data: page.data.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)),
          }));
          return { ...old, pages: newPages };
        }
      );
    },
  });
};
