import { GroupDetailContent } from "@/components/admin/group-detail-content";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/avatar-utils";
import { adminService } from "@/services/admin.service";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function ReportAssociatedEntity({
  id,
  type,
  isDeleted,
  label,
  isBanned,
  onUserAction,
}: {
  id: string;
  type: "user" | "group";
  isDeleted: boolean;
  label: string;
  isBanned?: boolean;
  onUserAction: (id: string, action: "view" | "ban" | "reset" | "unban") => void;
}) {
  const [groupDetailOpen, setGroupDetailOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: () => adminService.getUser(id),
    enabled: type === "user" && !isDeleted,
    retry: false,
  });

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["admin-group-detail", id],
    queryFn: () => adminService.getGroupDetail(id),
    enabled: type === "group" && !isDeleted,
    retry: false,
  });

  if (isDeleted) {
    return (
      <div className="border rounded-md p-4 space-y-2">
        <h4 className="font-semibold text-sm text-muted-foreground">{label}</h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            Deleted {type === "user" ? "Account" : "Group"}
          </Badge>
        </div>
      </div>
    );
  }

  if (type === "user") {
    if (userLoading) return <Skeleton className="h-24 w-full" />;

    if (!user)
      return (
        <div className="p-4 border rounded text-sm text-muted-foreground">
          {label}: User not found (might be deleted).
        </div>
      );

    const isUserBanned = isBanned !== undefined ? isBanned : user.is_banned;

    return (
      <div className="border rounded-md p-4 ">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-sm text-muted-foreground">{label}</h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onUserAction(id, "view")}>
              Details
            </Button>
            {!isUserBanned ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onUserAction(id, "ban")}
              >
                Ban
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onUserAction(id, "unban")}>
                Unban
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onUserAction(id, "reset")}>
              Reset
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar || undefined} alt={user.full_name} />
            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.full_name}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">@{user.username}</p>
              {user.is_banned && (
                <Badge variant="destructive" className="h-5 text-[10px] px-1">
                  Banned
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "group") {
    if (groupLoading) return <Skeleton className="h-24 w-full" />;
    if (!group)
      return (
        <div className="p-4 border rounded text-sm text-muted-foreground">
          {label}: Group not found.
        </div>
      );

    return (
      <div className="border rounded-md p-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-sm text-muted-foreground">{label}</h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setGroupDetailOpen(true)}>
              Details
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={group.avatar || undefined} alt={group.name} />
            <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{group.name}</p>
            <p className="text-xs text-muted-foreground">{group.member_count} members</p>
          </div>
        </div>

        <Dialog open={groupDetailOpen} onOpenChange={setGroupDetailOpen}>
          <DialogContent className="sm:max-w-lg overflow-hidden">
            <GroupDetailContent
              group={group}
              onViewMember={(uid) => onUserAction(uid, "view")}
              onBanMember={(uid) => onUserAction(uid, "ban")}
              onResetMember={(uid) => onUserAction(uid, "reset")}
              onUnbanMember={(uid) => onUserAction(uid, "unban")}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
