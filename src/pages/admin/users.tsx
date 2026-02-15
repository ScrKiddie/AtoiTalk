import {
  UserBanDialog,
  UserDetailDialog,
  UserResetDialog,
  UserUnbanDialog,
} from "@/components/admin/user-action-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { adminService } from "@/services/admin.service";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
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
  }, [debouncedSearch, roleFilter]);

  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);

  const queryParams = {
    query: debouncedSearch || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    limit: 20,
    cursor,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-users", queryParams],
    queryFn: () => adminService.getUsers(queryParams),
  });

  const handleBanClick = (userId: string) => {
    setSelectedUserId(userId);
    setBanDialogOpen(true);
  };

  const handleViewDetail = (userId: string) => {
    setDetailUserId(userId);
    setDetailOpen(true);
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

  const users = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage all registered users.</p>
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
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        {(cursorStack.length > 0 || data?.meta?.has_next) && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={cursorStack.length === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!data?.meta?.has_next}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
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
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                    <p className="font-medium text-lg">Failed to load users</p>
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    <span className="block truncate max-w-[120px]" title={user.id}>
                      {user.id}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="block truncate max-w-[150px]" title={user.full_name}>
                      {user.full_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="block truncate max-w-[120px]" title={`@${user.username}`}>
                      @{user.username}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="block truncate max-w-[180px]" title={user.email}>
                      {user.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "outline"}
                      className="capitalize"
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
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
                        <DropdownMenuItem onClick={() => handleViewDetail(user.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setResetUserId(user.id);
                            setResetDialogOpen(true);
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset Info
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.is_banned ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setUnbanDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Unban User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleBanClick(user.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Ban User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserBanDialog
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        userId={selectedUserId}
        onSuccess={() => setSelectedUserId(null)}
      />
      <UserUnbanDialog
        open={unbanDialogOpen}
        onOpenChange={setUnbanDialogOpen}
        userId={selectedUserId}
        onSuccess={() => setSelectedUserId(null)}
      />
      <UserResetDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        userId={resetUserId}
        onSuccess={() => setResetUserId(null)}
      />
      <UserDetailDialog open={detailOpen} onOpenChange={setDetailOpen} userId={detailUserId} />
    </div>
  );
}
