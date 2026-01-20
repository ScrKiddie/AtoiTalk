import { UserSelectionDialog } from "@/components/modals/user-selection-dialog";
import { useAddGroupMember } from "@/hooks/mutations/use-group";
import { User } from "@/types";

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
  const { mutate: addMembers, isPending } = useAddGroupMember();

  const handleAddMembers = (users: User[]) => {
    addMembers(
      { groupId, userIds: users.map((u) => u.id) },
      {
        onSuccess: () => {
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
    />
  );
}
