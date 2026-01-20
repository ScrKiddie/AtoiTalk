import { chatService } from "@/services";
import { GroupMember, PaginatedResponse } from "@/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export const useGroupMembers = (groupId: string, enabled = true) => {
  return useQuery<GroupMember[], Error>({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const response = await chatService.getGroupMembers(groupId, { limit: 100 });
      return response.data;
    },
    enabled: !!groupId && enabled,
    staleTime: 1000 * 60 * 5,
  });
};

export const useInfiniteGroupMembers = (
  groupId: string,
  query: string,
  options?: { enabled?: boolean }
) => {
  return useInfiniteQuery<PaginatedResponse<GroupMember>>({
    queryKey: ["group-members", "infinite", groupId, query],
    queryFn: ({ pageParam, signal }) =>
      chatService.getGroupMembers(
        groupId,
        {
          query: query || undefined,
          cursor: pageParam as string | undefined,
          limit: 20,
        },
        signal
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.has_next ? lastPage.meta.next_cursor : undefined,
    enabled: !!groupId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  });
};
