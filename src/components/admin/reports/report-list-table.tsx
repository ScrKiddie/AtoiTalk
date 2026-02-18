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
import { ReportListResponse } from "@/services/admin.service";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react";

interface ReportListTableProps {
  reports: ReportListResponse[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRefetch: () => void;
  onViewDetail: (id: string) => void;
  onResolve: (report: ReportListResponse) => void;
  onReject: (report: ReportListResponse) => void;
  onDelete: (id: string) => void;
}

export function ReportListTable({
  reports,
  isLoading,
  isError,
  error,
  onRefetch,
  onViewDetail,
  onResolve,
  onReject,
  onDelete,
}: ReportListTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reason</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Reporter</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={6} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                  <p className="font-medium text-lg">Failed to load reports</p>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                    {error instanceof Error ? error.message : "An unexpected error occurred"}
                  </p>
                  <Button variant="outline" onClick={onRefetch}>
                    Try Again
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No reports found.
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">{report.reason}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {report.target_type === "user" ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : report.target_type === "group" ? (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="capitalize">{report.target_type}</span>
                  </div>
                </TableCell>
                <TableCell>{report.reporter_name}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      report.status === "pending"
                        ? "outline"
                        : report.status === "resolved"
                          ? "default"
                          : "destructive"
                    }
                  >
                    {report.status}
                  </Badge>
                </TableCell>
                <TableCell>{format(new Date(report.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell className="text-right">
                  {report.status === "pending" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDetail(report.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onResolve(report)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Resolve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(report)}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDetail(report.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(report.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
