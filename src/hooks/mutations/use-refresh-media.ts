import { mediaService } from "@/services/media.service";
import { Message, PaginatedResponse } from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

export const useRefreshMedia = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, messageId }: { mediaId: string; messageId: string }) => {
      const newUrl = await mediaService.refreshMediaUrl(mediaId);
      return { mediaId, messageId, newUrl };
    },
    onSuccess: ({ mediaId, messageId, newUrl }) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Message>>>(
        { queryKey: ["messages", chatId] },
        (old) => {
          if (!old) return old;

          const newPages = old.pages.map((page) => ({
            ...page,
            data: page.data.map((msg) => {
              if (msg.id === messageId && msg.attachments) {
                return {
                  ...msg,
                  attachments: msg.attachments.map((att) =>
                    att.id === mediaId ? { ...att, url: newUrl } : att
                  ),
                };
              }
              return msg;
            }),
          }));

          return { ...old, pages: newPages };
        }
      );
    },
    onError: (error) => {
      console.error("Failed to refresh media URL", error);
    },
  });
};
