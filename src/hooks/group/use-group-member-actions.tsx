import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  useKickGroupMember,
  useTransferOwnership,
  useUpdateMemberRole,
} from "@/hooks/mutations/use-group";
import { GroupMember, PaginatedResponse } from "@/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface UseGroupMemberActionsProps {
  chatId: string;
  memberSearch: string;
}

export const useGroupMemberActions = ({ chatId, memberSearch }: UseGroupMemberActionsProps) => {
  const [kickCandidate, setKickCandidate] = useState<GroupMember | null>(null);
  const [promoteCandidate, setPromoteCandidate] = useState<GroupMember | null>(null);
  const [demoteCandidate, setDemoteCandidate] = useState<GroupMember | null>(null);
  const [transferCandidate, setTransferCandidate] = useState<GroupMember | null>(null);

  const queryClient = useQueryClient();

  const { mutate: kickMember, isPending: isKicking } = useKickGroupMember();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateMemberRole();
  const { mutate: transferOwnership, isPending: isTransferring } = useTransferOwnership();

  const handlePromoteToAdmin = (member: GroupMember) => {
    setPromoteCandidate(member);
  };

  const confirmPromote = () => {
    if (!promoteCandidate) return;
    updateRole(
      { chatId, userId: promoteCandidate.user_id, role: "admin" },
      {
        onSuccess: () => setPromoteCandidate(null),
      }
    );
  };

  const handleDemoteToMember = (member: GroupMember) => {
    setDemoteCandidate(member);
  };

  const confirmDemote = () => {
    if (!demoteCandidate) return;
    updateRole(
      { chatId, userId: demoteCandidate.user_id, role: "member" },
      {
        onSuccess: () => setDemoteCandidate(null),
      }
    );
  };

  const handleTransferOwnership = (member: GroupMember) => {
    setTransferCandidate(member);
  };

  const confirmTransfer = () => {
    if (!transferCandidate) return;
    transferOwnership(
      { chatId, newOwnerId: transferCandidate.user_id },
      {
        onSuccess: () => setTransferCandidate(null),
      }
    );
  };

  const handleKickMember = () => {
    if (!kickCandidate) return;
    kickMember(
      { chatId, userId: kickCandidate.user_id },
      {
        onSuccess: () => {
          queryClient.setQueryData<InfiniteData<PaginatedResponse<GroupMember>>>(
            ["group-members", "infinite", chatId, memberSearch.length >= 3 ? memberSearch : ""],
            (oldData) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                pages: oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((m) => m.id !== kickCandidate.id),
                })),
              };
            }
          );
          queryClient.removeQueries({ queryKey: ["users", "search"] });
          setKickCandidate(null);
        },
      }
    );
  };

  const renderConfirmationDialogs = () => (
    <>
      <ConfirmationDialog
        open={!!kickCandidate}
        onOpenChange={(open) => !open && setKickCandidate(null)}
        title="Remove Member?"
        description={`Are you sure you want to remove ${kickCandidate?.full_name} from the group?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleKickMember}
        isLoading={isKicking}
      />

      <ConfirmationDialog
        open={!!promoteCandidate}
        onOpenChange={(open) => !open && setPromoteCandidate(null)}
        title="Promote to Admin?"
        description={`Are you sure you want to promote ${promoteCandidate?.full_name} to Admin? They will be able to manage members and edit group info.`}
        confirmText="Promote"
        cancelText="Cancel"
        onConfirm={confirmPromote}
        isLoading={isUpdatingRole}
        className="z-[66]"
        overlayClassName="z-[65]"
      />

      <ConfirmationDialog
        open={!!demoteCandidate}
        onOpenChange={(open) => !open && setDemoteCandidate(null)}
        title="Demote to Member?"
        description={`Are you sure you want to demote ${demoteCandidate?.full_name} back to Member? They will lose admin privileges.`}
        confirmText="Demote"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDemote}
        isLoading={isUpdatingRole}
        className="z-[66]"
        overlayClassName="z-[65]"
      />

      <ConfirmationDialog
        open={!!transferCandidate}
        onOpenChange={(open) => !open && setTransferCandidate(null)}
        title="Transfer Ownership?"
        description={`Are you sure you want to transfer ownership to ${transferCandidate?.full_name}? You will become an Admin and lose Owner privileges. This action cannot be undone.`}
        confirmText="Transfer Ownership"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmTransfer}
        isLoading={isTransferring}
      />
    </>
  );

  return {
    kickCandidate,
    setKickCandidate,
    handlePromoteToAdmin,
    handleDemoteToMember,
    handleTransferOwnership,
    renderConfirmationDialogs,
  };
};
