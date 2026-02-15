import { InfiniteUserList } from "@/components/infinite-user-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/avatar-utils";
import {
  adminService,
  type AdminGroupDetailResponse,
  type GroupMemberDTO,
} from "@/services/admin.service";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Ban, CheckCircle, Eye, Globe, Lock, MoreHorizontal, RotateCcw, Users } from "lucide-react";

interface GroupDetailContentProps {
  group: AdminGroupDetailResponse;
  onViewMember: (userId: string) => void;
  onBanMember: (userId: string) => void;
  onResetMember: (userId: string) => void;
  onUnbanMember: (userId: string) => void;
}

export function GroupDetailContent({
  group,
  onViewMember,
  onBanMember,
  onResetMember,
  onUnbanMember,
}: GroupDetailContentProps) {
  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMembers,
  } = useInfiniteQuery({
    queryKey: ["admin-group-members-infinite", group.chat_id, ""] as [string, string, string],
    queryFn: adminService.getGroupMembersInfinite,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor,
    initialPageParam: undefined as string | undefined,
  });

  const membersList = (membersData?.pages.flatMap((page) => page.data) || []) as GroupMemberDTO[];

  return (
    <div className="space-y-4 py-2 flex flex-col h-[60vh]">
      <div className="flex items-center gap-4 shrink-0">
        <Avatar className="h-16 w-16">
          <AvatarImage src={group.avatar || undefined} alt={group.name} />
          <AvatarFallback className="text-lg">{getInitials(group.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-lg">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
          )}
          <div className="flex gap-2 mt-1">
            {group.is_public ? (
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" /> Public
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" /> Private
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" /> {group.member_count} members
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm shrink-0">
        <div className="flex justify-between py-1.5 border-b">
          <span className="text-muted-foreground">Created</span>
          <span className="font-medium">
            {group.created_at ? format(new Date(group.created_at), "PPP") : "—"}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b">
          <span className="text-muted-foreground">Group ID</span>
          <span className="font-mono text-xs">{group.id.slice(0, 8)}...</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <h4 className="text-sm font-semibold mb-3 shrink-0">Members</h4>
        <div className="flex-1 min-h-0 border rounded-md">
          <InfiniteUserList
            contentClassName="gap-0"
            users={membersList}
            isLoading={membersLoading}
            isError={membersError}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            refetch={refetchMembers}
            skeletonCount={3}
            renderActions={(member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={member.avatar || undefined} alt={member.full_name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      member.role === "owner"
                        ? "default"
                        : member.role === "admin"
                          ? "secondary"
                          : "outline"
                    }
                    className="capitalize text-xs"
                  >
                    {member.role}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewMember(member.user_id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResetMember(member.user_id)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Info
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {member.is_banned ? (
                        <DropdownMenuItem onClick={() => onUnbanMember(member.user_id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Unban User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onBanMember(member.user_id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Ban User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
