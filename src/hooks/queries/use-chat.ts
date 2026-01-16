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
  useIsFetching,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

export function useChats(params?: GetChatsParams) {
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
  });
}

export function useChat(chatId: string | null) {
  const queryClient = useQueryClient();
  const chatsIsFetching = useIsFetching({ queryKey: ["chats"] });

  const getChatsQueryState = () => {
    const states = queryClient
      .getQueryCache()
      .findAll({ queryKey: ["chats"] })
      .map((q) => q.state);
    return states.length > 0 ? states[0] : null;
  };

  const cachedData = useMemo(() => {
    if (!chatId) return undefined;

    const existingData = queryClient.getQueryData<ChatListItem>(["chat", chatId]);
    if (existingData) return existingData;

    const chatsCache = queryClient.getQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>({
      queryKey: ["chats"],
    });

    for (const [, cache] of chatsCache) {
      if (cache?.pages) {
        for (const page of cache.pages) {
          const found = page.data.find((c) => c.id === chatId);
          if (found) {
            queryClient.setQueryData<ChatListItem>(["chat", chatId], found);
            return found;
          }
        }
      }
    }

    return undefined;
  }, [chatId, chatsIsFetching, queryClient]);

  const chatsState = getChatsQueryState();
  const chatsHasLoaded = chatsState?.status === "success" && chatsState?.fetchStatus === "idle";
  const isWaitingForChats = !!chatId && !cachedData && !chatsHasLoaded;

  const shouldFetch = !!chatId && !cachedData && chatsHasLoaded;

  const query = useQuery({
    queryKey: ["chat", chatId],
    queryFn: ({ signal }) => chatService.getChatById(chatId!, signal),
    enabled: shouldFetch,
    retry: false,
    staleTime: 1000 * 60 * 5,
    initialData: cachedData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isLoading: query.isLoading || isWaitingForChats,
  };
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
