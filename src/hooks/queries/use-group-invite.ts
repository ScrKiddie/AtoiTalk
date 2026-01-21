import { chatService } from "@/services";
import { useQuery } from "@tanstack/react-query";

export const useGroupInvite = (groupId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["group-invite", groupId],
    queryFn: ({ signal }) => chatService.getGroupInviteCode(groupId, signal),
    enabled: enabled && !!groupId,
    staleTime: 1000 * 60 * 5,
  });
};
