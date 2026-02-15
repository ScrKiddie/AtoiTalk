import {
  UserBanDialog,
  UserDetailDialog,
  UserResetDialog,
} from "@/components/admin/user-action-dialogs";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { LoadingModal } from "@/components/ui/loading-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  Loader2,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { adminService } from "@/services/admin.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { GroupDetailContent } from "@/components/admin/group-detail-content";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminGroups() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCursor(undefined);
    setCursorStack([]);
  }, [debouncedSearch]);

  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetGroupId, setResetGroupId] = useState<string | null>(null);
  const [resetName, setResetName] = useState(false);
  const [resetDescription, setResetDescription] = useState(false);
  const [resetAvatar, setResetAvatar] = useState(false);

  const [dissolveDialogOpen, setDissolveDialogOpen] = useState(false);
  const [dissolveGroupId, setDissolveGroupId] = useState<string | null>(null);
  const [dissolveGroupName, setDissolveGroupName] = useState("");

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const queryParams = {
    query: debouncedSearch || undefined,
    limit: 20,
    cursor,
  };

  const [memberBanOpen, setMemberBanOpen] = useState(false);
  const [memberResetOpen, setMemberResetOpen] = useState(false);
  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const memberUnbanMutation = useMutation({
    mutationFn: adminService.unbanUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-group-members-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User unbanned successfully");
    },
    onError: () => toast.error("Failed to unban user"),
  });

  const handleMemberBan = (userId: string) => {
    setSelectedMemberId(userId);
    setMemberBanOpen(true);
  };

  const handleMemberReset = (userId: string) => {
    setSelectedMemberId(userId);
    setMemberResetOpen(true);
  };

  const handleMemberView = (userId: string) => {
    setSelectedMemberId(userId);
    setMemberDetailOpen(true);
  };

  const handleMemberUnban = (userId: string) => {
    memberUnbanMutation.mutate(userId);
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-groups", queryParams],
    queryFn: () => adminService.getGroups(queryParams),
  });

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

  const dissolveMutation = useMutation({
    mutationFn: adminService.dissolveGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      toast.success("Group dissolved successfully");
      setDissolveDialogOpen(false);
      setDissolveGroupId(null);
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
      setResetDialogOpen(false);
      setResetGroupId(null);
      setResetName(false);
      setResetDescription(false);
      setResetAvatar(false);
    },
    onError: () => toast.error("Failed to reset group info"),
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

  const handleResetSubmit = () => {
    if (resetGroupId && (resetName || resetDescription || resetAvatar)) {
      resetMutation.mutate({
        groupId: resetGroupId,
        data: {
          reset_name: resetName,
          reset_description: resetDescription,
          reset_avatar: resetAvatar,
        },
      });
    }
  };

  const handleNextPage = useCallback(() => {
    if (data?.meta?.has_next && data.meta.next_cursor) {
      setCursorStack((prev) => [...prev, cursor || ""]);
      setCursor(data.meta.next_cursor);
    }
  }, [data, cursor]);

  const handlePrevPage = useCallback(() => {
    setCursorStack((prev) => {
      const newStack = [...prev];
      const prevCursor = newStack.pop();
      setCursor(prevCursor || undefined);
      return newStack;
    });
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const groups = data?.data || [];

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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups by name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {(cursorStack.length > 0 || data?.meta?.has_next) && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={cursorStack.length === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!data?.meta?.has_next}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead className="w-[250px]">Group</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || (isError && isFetching) ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-14" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                    <p className="font-medium text-lg">Failed to load groups</p>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                      {error instanceof Error ? error.message : "An unexpected error occurred"}
                    </p>
                    <Button variant="outline" onClick={() => refetch()}>
                      Try Again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-14" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No groups found.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    <span className="block truncate max-w-[120px]" title={group.id}>
                      {group.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium leading-none truncate">{group.name}</span>
                      {group.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {group.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {group.is_public ? (
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="h-3 w-3" /> Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" /> Private
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(group.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(group.id, group.chat_id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetClick(group.chat_id)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset Info
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDissolveClick(group.chat_id, group.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Dissolve Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
              onViewMember={handleMemberView}
              onBanMember={handleMemberBan}
              onResetMember={handleMemberReset}
              onUnbanMember={handleMemberUnban}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetDialogOpen}
        onOpenChange={(val) => !resetMutation.isPending && setResetDialogOpen(val)}
      >
        <DialogContent
          onInteractOutside={(e) => resetMutation.isPending && e.preventDefault()}
          onEscapeKeyDown={(e) => resetMutation.isPending && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Reset Group Info</DialogTitle>
            <DialogDescription>Select which information to reset to defaults.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={resetAvatar}
                onChange={(e) => setResetAvatar(e.target.checked)}
                className="rounded"
                disabled={resetMutation.isPending}
              />
              <span>Reset Avatar</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={resetName}
                onChange={(e) => setResetName(e.target.checked)}
                className="rounded"
                disabled={resetMutation.isPending}
              />
              <span>Reset Name</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={resetDescription}
                onChange={(e) => setResetDescription(e.target.checked)}
                className="rounded"
                disabled={resetMutation.isPending}
              />
              <span>Reset Description</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={resetMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetSubmit}
              disabled={
                (!resetName && !resetDescription && !resetAvatar) || resetMutation.isPending
              }
              className="relative"
            >
              <span className={resetMutation.isPending ? "opacity-0" : ""}>Reset Info</span>
              {resetMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="size-4 text-primary-foreground" />
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dissolveDialogOpen} onOpenChange={setDissolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dissolve Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to dissolve <strong>{dissolveGroupName}</strong>? This action
              cannot be undone and all members will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDissolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => dissolveGroupId && dissolveMutation.mutate(dissolveGroupId)}
              disabled={dissolveMutation.isPending}
            >
              {dissolveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Dissolve Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
