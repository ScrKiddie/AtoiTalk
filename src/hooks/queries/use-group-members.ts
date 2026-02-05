import { chatService } from "@/services";
import { GroupMember, PaginatedResponse } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";

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
