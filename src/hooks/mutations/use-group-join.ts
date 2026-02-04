import { toast } from "@/lib/toast";
import { chatService } from "@/services";
import { ChatListItem, PaginatedResponse, PublicGroupDTO } from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => chatService.joinGroup(groupId),
    onSuccess: (newChat) => {
      toast.success("Joined group successfully");

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!newChat || !oldData?.pages) return oldData;

          const pages = [...oldData.pages];
          if (pages.length > 0) {
            const filteredData = pages[0].data.filter((c) => c.id !== newChat.id);

            pages[0] = {
              ...pages[0],
              data: [newChat, ...filteredData],
            };
          }

          return { ...oldData, pages };
        }
      );

      if (!newChat) {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<PublicGroupDTO>>>(
        { queryKey: ["public-groups"] },
        (oldData) => {
          if (!oldData?.pages) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: PaginatedResponse<PublicGroupDTO>) => ({
              ...page,
              data: Array.isArray(page.data)
                ? page.data.map((group: PublicGroupDTO) =>
                    group.chat_id === newChat?.id ? { ...group, is_member: true } : group
                  )
                : [],
            })),
          };
        }
      );
    },
    onError: (error: AxiosError<{ error: string }>) => {
      toast.error(error.response?.data?.error || "Failed to join group");
    },
  });
}
