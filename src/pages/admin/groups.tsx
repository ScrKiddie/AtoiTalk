import { GroupDetailContent } from "@/components/admin/group-detail-content";
import { DissolveGroupDialog } from "@/components/admin/groups/dissolve-group-dialog";
import { GroupsFilter } from "@/components/admin/groups/groups-filter";
import { GroupsTable } from "@/components/admin/groups/groups-table";
import { ResetGroupInfoDialog } from "@/components/admin/groups/reset-group-info-dialog";
import {
  UserBanDialog,
  UserDetailDialog,
  UserResetDialog,
} from "@/components/admin/user-action-dialogs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingModal } from "@/components/ui/loading-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGroups } from "@/hooks/admin/use-admin-groups";
import { useGroupActions } from "@/hooks/admin/use-group-actions";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function AdminGroups() {
  const queryClient = useQueryClient();
  const {
    groups,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    search,
    handleSearch,
    handleNextPage,
    handlePrevPage,
    hasPrevPage,
    hasNextPage,
  } = useAdminGroups();

  const { dissolveMutation, resetMutation } = useGroupActions();

  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetGroupId, setResetGroupId] = useState<string | null>(null);

  const [dissolveDialogOpen, setDissolveDialogOpen] = useState(false);
  const [dissolveGroupId, setDissolveGroupId] = useState<string | null>(null);
  const [dissolveGroupName, setDissolveGroupName] = useState("");

  const [memberBanOpen, setMemberBanOpen] = useState(false);
  const [memberResetOpen, setMemberResetOpen] = useState(false);
  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: groupDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-group-detail", detailGroupId],
    queryFn: () => adminService.getGroupDetail(detailGroupId!),
    enabled: !!detailGroupId && detailOpen,
  });

  const handleViewDetail = async (groupId: string, chatId: string) => {
    setIsLoadingDetail(true);
    try {
      await Promise.all([
        queryClient.fetchQuery({
          queryKey: ["admin-group-detail", groupId],
          queryFn: () => adminService.getGroupDetail(groupId),
        }),
        queryClient.fetchInfiniteQuery({
          queryKey: ["admin-group-members-infinite", chatId, ""],
          queryFn: ({ pageParam }) =>
            adminService.getGroupMembersInfinite({
              queryKey: ["admin-group-members-infinite", chatId, ""],
              pageParam,
            }),
          initialPageParam: undefined as string | undefined,
        }),
      ]);

      setDetailGroupId(groupId);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Failed to load group details");
      console.error(error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const memberUnbanMutation = useMutation({
    mutationFn: adminService.unbanUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-group-members-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User unbanned successfully");
    },
    onError: () => toast.error("Failed to unban user"),
  });

  const handleDissolveClick = (groupId: string, groupName: string) => {
    setDissolveGroupId(groupId);
    setDissolveGroupName(groupName);
    setDissolveDialogOpen(true);
  };

  const handleResetClick = (groupId: string) => {
    setResetGroupId(groupId);
    setResetDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground">Manage all group chats.</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <GroupsFilter
        search={search}
        onSearchChange={handleSearch}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
      />

      <GroupsTable
        groups={groups}
        isLoading={isLoading}
        isError={isError}
        isFetching={isFetching}
        error={error}
        onRefetch={refetch}
        onViewDetail={handleViewDetail}
        onResetInfo={handleResetClick}
        onDissolve={handleDissolveClick}
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>Group Detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : groupDetail ? (
            <GroupDetailContent
              group={groupDetail}
              onViewMember={(id) => {
                setSelectedMemberId(id);
                setMemberDetailOpen(true);
              }}
              onBanMember={(id) => {
                setSelectedMemberId(id);
                setMemberBanOpen(true);
              }}
              onResetMember={(id) => {
                setSelectedMemberId(id);
                setMemberResetOpen(true);
              }}
              onUnbanMember={(id) => memberUnbanMutation.mutate(id)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ResetGroupInfoDialog
        open={resetDialogOpen}
        onOpenChange={(val) => {
          if (!val) setResetGroupId(null);
          setResetDialogOpen(val);
        }}
        isPending={resetMutation.isPending}
        onConfirm={(data) => {
          if (resetGroupId) {
            resetMutation.mutate(
              { groupId: resetGroupId, data },
              {
                onSuccess: () => setResetDialogOpen(false),
              }
            );
          }
        }}
      />

      <DissolveGroupDialog
        open={dissolveDialogOpen}
        onOpenChange={(val) => {
          if (!val) setDissolveGroupId(null);
          setDissolveDialogOpen(val);
        }}
        groupName={dissolveGroupName}
        isPending={dissolveMutation.isPending}
        onConfirm={() => {
          if (dissolveGroupId) {
            dissolveMutation.mutate(dissolveGroupId, {
              onSuccess: () => setDissolveDialogOpen(false),
            });
          }
        }}
      />

      <LoadingModal isOpen={isLoadingDetail} />

      <UserBanDialog
        open={memberBanOpen}
        onOpenChange={setMemberBanOpen}
        userId={selectedMemberId}
        onSuccess={() => setSelectedMemberId(null)}
      />
      <UserResetDialog
        open={memberResetOpen}
        onOpenChange={setMemberResetOpen}
        userId={selectedMemberId}
        onSuccess={() => setSelectedMemberId(null)}
      />
      <UserDetailDialog
        open={memberDetailOpen}
        onOpenChange={setMemberDetailOpen}
        userId={selectedMemberId}
      />
    </div>
  );
}
