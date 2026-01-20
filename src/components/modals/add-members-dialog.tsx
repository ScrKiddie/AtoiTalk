import { UserSelectionDialog } from "@/components/modals/user-selection-dialog";
import { useAddGroupMember } from "@/hooks/mutations/use-group";
import { GroupMember, PaginatedResponse, User } from "@/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";

interface AddMembersDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  groupId: string;
  existingMemberIds: string[];
}

export function AddMembersDialog({
  isOpen,
  onClose,
  groupId,
  existingMemberIds,
}: AddMembersDialogProps) {
  const queryClient = useQueryClient();
  const { mutate: addMembers, isPending } = useAddGroupMember();

  const handleAddMembers = (users: User[]) => {
    addMembers(
      { groupId, userIds: users.map((u) => u.id) },
      {
        onSuccess: () => {
          queryClient.removeQueries({ queryKey: ["users", "search"] });
          queryClient.setQueryData<InfiniteData<PaginatedResponse<GroupMember>>>(
            ["group-members", "infinite", groupId, ""],
            (oldData) => {
              if (!oldData) return oldData;
              const newMembers: GroupMember[] = users.map((u) => ({
                id: u.id,
                user_id: u.id,
                full_name: u.full_name,
                avatar: u.avatar,
                role: "member",
                username: u.username,
                joined_at: new Date().toISOString(),
                is_online: u.is_online,
              }));

              const newPages = [...oldData.pages];
              newPages[0] = {
                ...newPages[0],
                data: [...newMembers, ...newPages[0].data],
              };

              return { ...oldData, pages: newPages };
            }
          );
          onClose(false);
        },
      }
    );
  };

  return (
    <UserSelectionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleAddMembers}
      title="Add Members"
      existingMemberIds={existingMemberIds}
      isSubmitting={isPending}
      confirmLabel="Add"
      excludeGroupId={groupId}
    />
  );
}
