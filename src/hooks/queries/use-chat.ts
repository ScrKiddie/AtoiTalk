import { toast } from "@/lib/toast";
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
import { useMemo } from "react";

export function useChats(params?: GetChatsParams, options?: { enabled?: boolean }) {
  const normalizedQuery = params?.query || undefined;

  return useInfiniteQuery({
    queryKey: ["chats", normalizedQuery],
    queryFn: ({ pageParam, signal }) =>
      chatService.getChats(
        {
          ...params,
          query: normalizedQuery,
          cursor: pageParam as string | undefined,
          limit: params?.limit ?? 20,
        },
        signal
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.has_next ? lastPage.meta.next_cursor : undefined,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: options?.enabled,
  });
}

export function useChat(chatId: string | null) {
  const queryClient = useQueryClient();

  const cachedData = useMemo(() => {
    if (!chatId) return undefined;

    const chatsCache = queryClient.getQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>({
      queryKey: ["chats"],
    });

    for (const [, cache] of chatsCache) {
      if (cache?.pages) {
        for (const page of cache.pages) {
          const found = page.data.find((c) => c.id === chatId);
          if (found) {
            if (found.type === "private") {
              return found;
            }
          }
        }
      }
    }

    return undefined;
  }, [chatId, queryClient]);

  const query = useQuery({
    queryKey: ["chat", chatId],
    queryFn: ({ signal }) => chatService.getChatById(chatId!, signal),
    enabled: !!chatId,
    retry: false,
    staleTime: 1000 * 60 * 5,
    initialData: cachedData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

export function useCreatePrivateChat() {
  const queryClient = useQueryClient();
  const setActiveChatId = useChatStore((state) => state.setActiveChatId);

  return useMutation({
    mutationFn: (data: CreatePrivateChatRequest) => chatService.createPrivateChat(data),
    onSuccess: async (newChat) => {
      queryClient.setQueryData<ChatListItem>(["chat", newChat.id], newChat);

      const existingMessages = queryClient.getQueryData<InfiniteData<PaginatedResponse<Message>>>([
        "messages",
        newChat.id,
        undefined,
      ]);

      if (!existingMessages && !newChat.last_message) {
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
      }

      setActiveChatId(newChat.id);

      try {
        const fullChat = await chatService.getChatById(newChat.id);
        queryClient.setQueryData<ChatListItem>(["chat", newChat.id], fullChat);
      } catch (error) {
        console.error("Failed to fetch full chat details on create:", error);
      }
    },
    onError: (error) => {
      console.error("Failed to create private chat:", error);
      toast.error("Failed to start chat");
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
