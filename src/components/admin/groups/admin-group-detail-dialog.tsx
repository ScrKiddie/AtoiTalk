import { GroupDetailContent } from "@/components/admin/group-detail-content";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService } from "@/services/admin.service";
import { useQuery } from "@tanstack/react-query";

interface AdminGroupDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  onViewMember: (userId: string) => void;
  onBanMember: (userId: string) => void;
  onResetMember: (userId: string) => void;
  onUnbanMember: (userId: string) => void;
}

export function AdminGroupDetailDialog({
  open,
  onOpenChange,
  groupId,
  onViewMember,
  onBanMember,
  onResetMember,
  onUnbanMember,
}: AdminGroupDetailDialogProps) {
  const { data: groupDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-group-detail", groupId],
    queryFn: () => adminService.getGroupDetail(groupId!),
    enabled: !!groupId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onViewMember={onViewMember}
            onBanMember={onBanMember}
            onResetMember={onResetMember}
            onUnbanMember={onUnbanMember}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
