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
  const activeChatId = useChatStore((state) => state.activeChatId);

  const cachedData = useMemo(() => {
    if (!chatId) return undefined;

    const exactChatCache = queryClient.getQueryState<ChatListItem>(["chat", chatId]);
    if (exactChatCache?.data) {
      return { data: exactChatCache.data, updatedAt: exactChatCache.dataUpdatedAt };
    }

    const chatsCache = queryClient.getQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>({
      queryKey: ["chats"],
    });

    for (const [key, cache] of chatsCache) {
      if (cache?.pages) {
        for (const page of cache.pages) {
          const found = page.data.find((c) => c.id === chatId);
          if (found) {
            const queryState = queryClient.getQueryState(key);
            const isSuspicious =
              found.type === "group" && (!found.member_count || found.member_count === 0);
            return {
              data: found,
              updatedAt: isSuspicious ? 0 : queryState?.dataUpdatedAt,
              isSuspicious,
            };
          }
        }
      }
    }

    return undefined;
  }, [chatId, queryClient]);

  const query = useQuery({
    queryKey: ["chat", chatId],
    queryFn: ({ signal }) => {
      return chatService.getChatById(chatId!, signal);
    },
    enabled: !!chatId && activeChatId === chatId,
    retry: 3,
    retryDelay: 1000,
    staleTime: cachedData?.isSuspicious ? 0 : 1000 * 30,
    initialData: cachedData?.data,
    initialDataUpdatedAt: cachedData?.updatedAt,
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
    },
    onError: (error) => {
      console.error("Failed to create private chat:", error);
      toast.error("Failed to start chat");
    },
  });
}

export function useSearchPublicGroups(query: string, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: ["public-groups", query],
    queryFn: ({ pageParam, signal }) =>
      chatService.searchPublicGroups(
        {
          query,
          cursor: pageParam as string | undefined,
          limit: 20,
        },
        signal
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.has_next ? lastPage.meta.next_cursor : undefined,
    enabled: options?.enabled,
    staleTime: 1000 * 60 * 5,
  });
}
