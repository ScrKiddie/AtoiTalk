import { errorLog } from "@/lib/logger";
import { toast } from "@/lib/toast";
import { mediaService } from "@/services/media.service";
import { Message, PaginatedResponse } from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const useRefreshMedia = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, messageId }: { mediaId: string; messageId: string }) => {
      try {
        const newUrl = await mediaService.refreshMediaUrl(mediaId);
        return { mediaId, messageId, newUrl, mediaDeleted: false };
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 403) {
          return { mediaId, messageId, newUrl: "", mediaDeleted: true };
        }
        throw error;
      }
    },
    onSuccess: ({ mediaId, messageId, newUrl, mediaDeleted }) => {
      if (mediaDeleted) {
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
                      att.id === mediaId ? { ...att, is_deleted: true } : att
                    ),
                  };
                }
                return msg;
              }),
            }));

            return { ...old, pages: newPages };
          }
        );

        toast.error("Attachment has been deleted");
        return;
      }

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
      errorLog("Failed to refresh media URL", error);
    },
  });
};
