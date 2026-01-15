import { chatService } from "@/services";
import { useChatStore } from "@/store";
import type {
  ChatListItem,
  CreatePrivateChatRequest,
  GetChatsParams,
  Message,
  PaginatedResponse,
} from "@/types";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export function useChats(params?: GetChatsParams) {
  return useInfiniteQuery({
    queryKey: ["chats", params?.query],
    queryFn: ({ pageParam, signal }) =>
      chatService.getChats(
        {
          ...params,
          cursor: pageParam as string | undefined,
          limit: params?.limit ?? 20,
        },
        signal
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.has_next ? lastPage.meta.next_cursor : undefined,
  });
}

export function useChat(chatId: string | null) {
  return useQuery({
    queryKey: ["chat", chatId],
    queryFn: ({ signal }) => chatService.getChatById(chatId!, signal),
    enabled: !!chatId,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePrivateChat() {
  const queryClient = useQueryClient();
  const setActiveChatId = useChatStore((state) => state.setActiveChatId);

  return useMutation({
    mutationFn: (data: CreatePrivateChatRequest) => chatService.createPrivateChat(data),
    onSuccess: async (newChat) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            const firstPage = newPages[0];

            if (firstPage.data.some((c) => c.id === newChat.id)) return oldData;

            newPages[0] = {
              ...firstPage,
              data: [newChat, ...firstPage.data],
            };
          }
          return { ...oldData, pages: newPages };
        }
      );

      queryClient.setQueryData<ChatListItem>(["chat", newChat.id], newChat);

      queryClient.setQueryData<InfiniteData<PaginatedResponse<Message>>>(
        ["messages", newChat.id, undefined],
        {
          pages: [
            {
              data: [],
              meta: {
                has_next: false,
                has_prev: false,
                next_cursor: null as unknown as string,
                prev_cursor: null as unknown as string,
              },
            },
          ],
          pageParams: [],
        }
      );

      setActiveChatId(newChat.id);

      try {
        const fullChat = await chatService.getChatById(newChat.id);

        queryClient.setQueryData<ChatListItem>(["chat", newChat.id], fullChat);

        queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
          { queryKey: ["chats"] },
          (oldData) => {
            if (!oldData) return oldData;
            const newPages = oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((c) => (c.id === fullChat.id ? fullChat : c)),
            }));
            return { ...oldData, pages: newPages };
          }
        );
      } catch (error) {
        console.error("Failed to fetch full chat details on create:", error);

        queryClient.invalidateQueries({ queryKey: ["chats"] });
        queryClient.invalidateQueries({ queryKey: ["chat", newChat.id] });
      }
    },
  });
}

export function useHideChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatService.hideChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useMarkChatAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatService.markAsRead(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
