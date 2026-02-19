import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useGroupActions() {
  const queryClient = useQueryClient();

  const dissolveMutation = useMutation({
    mutationFn: adminService.dissolveGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      toast.success("Group dissolved successfully");
    },
    onError: () => toast.error("Failed to dissolve group"),
  });

  const resetMutation = useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { reset_name?: boolean; reset_description?: boolean; reset_avatar?: boolean };
    }) => adminService.resetGroupInfo(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-group-detail"] });
      toast.success("Group info reset successfully");
    },
    onError: () => toast.error("Failed to reset group info"),
  });

  return {
    dissolveMutation,
    resetMutation,
  };
}
