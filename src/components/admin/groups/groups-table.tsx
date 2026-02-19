import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminGroupListResponse } from "@/services/admin.service";
import { format } from "date-fns";
import { AlertCircle, Eye, Globe, Lock, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";

interface GroupsTableProps {
  groups: AdminGroupListResponse[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
  onRefetch: () => void;
  onViewDetail: (groupId: string, chatId: string) => void;
  onResetInfo: (groupId: string) => void;
  onDissolve: (groupId: string, groupName: string) => void;
}

export function GroupsTable({
  groups,
  isLoading,
  isError,
  isFetching,
  error,
  onRefetch,
  onViewDetail,
  onResetInfo,
  onDissolve,
}: GroupsTableProps) {
  return (
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
                    {error?.message || "An unexpected error occurred"}
                  </p>
                  <Button variant="outline" onClick={onRefetch}>
                    Try Again
                  </Button>
                </div>
              </TableCell>
            </TableRow>
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
                      <DropdownMenuItem onClick={() => onViewDetail(group.id, group.chat_id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResetInfo(group.chat_id)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Info
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDissolve(group.chat_id, group.name)}
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
  );
}
