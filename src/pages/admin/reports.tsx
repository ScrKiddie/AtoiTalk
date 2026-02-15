import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import {
  UserBanDialog,
  UserDetailDialog,
  UserResetDialog,
  UserUnbanDialog,
} from "@/components/admin/user-action-dialogs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  adminService,
  type AdminUserDetailResponse,
  type GroupMemberDTO,
  type PaginatedResponse,
  type ReportDetailResponse,
  type ReportListResponse,
} from "@/services/admin.service";
import { mediaService } from "@/services/media.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Search,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ReportAssociatedEntity } from "@/components/admin/report-associated-entity";
import AttachmentCard from "@/components/attachment-card";
import { GlobalLightbox } from "@/components/ui/lightbox";
import { LoadingModal } from "@/components/ui/loading-modal";
import { Media } from "@/types";

export default function AdminReports() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [limit] = useState(10);
  const [detailReportId, setDetailReportId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportListResponse | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [userActionOpen, setUserActionOpen] = useState(false);
  const [userReviewId, setUserReviewId] = useState<string | null>(null);
  const [userBanOpen, setUserBanOpen] = useState(false);
  const [userUnbanOpen, setUserUnbanOpen] = useState(false);
  const [userResetOpen, setUserResetOpen] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch, isError, error } = useQuery({
    queryKey: ["admin-reports", cursor, statusFilter, limit, debouncedSearch],
    queryFn: () =>
      adminService.getReports({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit,
        cursor,
        query: debouncedSearch || undefined,
      }),
  });

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

  const { data: reportDetail } = useQuery({
    queryKey: ["admin-report-detail", detailReportId],
    queryFn: () => adminService.getReportDetail(detailReportId!),
    enabled: !!detailReportId && detailOpen,
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: "resolved" | "rejected";
      notes?: string;
    }) => adminService.resolveReport(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report updated successfully");
      setResolveOpen(false);
      setRejectOpen(false);
      setDetailOpen(false);
      setResolveNotes("");
    },
    onError: () => toast.error("Failed to update report"),
  });

  const handleUnbanSuccess = (targetUserId: string) => {
    if (!detailReportId) return;

    queryClient.setQueryData(
      ["admin-report-detail", detailReportId],
      (oldData: ReportDetailResponse | undefined) => {
        if (!oldData) return oldData;

        let newData = { ...oldData };
        if (newData.reporter_id === targetUserId) {
          newData.reporter_is_banned = false;
        }
        if (newData.target_id === targetUserId && newData.target_type === "user") {
          newData.target_is_banned = false;
        }
        if (
          newData.target_type === "message" &&
          newData.evidence_snapshot?.sender_id === targetUserId
        ) {
          newData.target_is_banned = false;
        }

        return newData;
      }
    );

    queryClient.setQueryData(
      ["admin-user-detail", targetUserId],
      (oldData: AdminUserDetailResponse | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          is_banned: false,
        };
      }
    );

    queryClient.setQueriesData({ queryKey: ["admin-group-members-infinite"] }, (oldData: any) => {
      if (!oldData || !oldData.pages) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: PaginatedResponse<GroupMemberDTO>) => ({
          ...page,
          data: page.data.map((member) => {
            if (member.user_id === targetUserId) {
              return { ...member, is_banned: false };
            }
            return member;
          }),
        })),
      };
    });

    queryClient.invalidateQueries({ queryKey: ["admin-report-detail"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", targetUserId] });
  };

  const handleBanSuccess = (targetUserId: string) => {
    if (!detailReportId) return;

    queryClient.setQueryData(
      ["admin-report-detail", detailReportId],
      (oldData: ReportDetailResponse | undefined) => {
        if (!oldData) return oldData;

        let newData = { ...oldData };
        if (newData.reporter_id === targetUserId) {
          newData.reporter_is_banned = true;
        }
        if (newData.target_id === targetUserId && newData.target_type === "user") {
          newData.target_is_banned = true;
        }
        if (
          newData.target_type === "message" &&
          newData.evidence_snapshot?.sender_id === targetUserId
        ) {
          newData.target_is_banned = true;
        }
        return newData;
      }
    );

    queryClient.setQueryData(
      ["admin-user-detail", targetUserId],
      (oldData: AdminUserDetailResponse | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          is_banned: true,
        };
      }
    );

    queryClient.setQueriesData({ queryKey: ["admin-group-members-infinite"] }, (oldData: any) => {
      if (!oldData || !oldData.pages) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: PaginatedResponse<GroupMemberDTO>) => ({
          ...page,
          data: page.data.map((member) => {
            if (member.user_id === targetUserId) {
              return { ...member, is_banned: true };
            }
            return member;
          }),
        })),
      };
    });

    queryClient.invalidateQueries({ queryKey: ["admin-report-detail"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", targetUserId] });
  };

  const handleViewDetail = async (reportId: string) => {
    setIsFetchingDetail(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ["admin-report-detail", reportId],
        queryFn: () => adminService.getReportDetail(reportId),
        staleTime: 1000 * 60 * 5,
      });
      setDetailReportId(reportId);
      setDetailOpen(true);
    } catch (error) {
      toast.error("Failed to load report details");
      console.error(error);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const getAttachments = useMemo(() => {
    if (!reportDetail?.evidence_snapshot) return [];

    const rawAttachments =
      reportDetail.evidence_snapshot.attachments ||
      reportDetail.evidence_snapshot.data?.attachments ||
      [];

    return rawAttachments.map((item: string | Media, index: number) => {
      if (typeof item === "string") {
        const match = item.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
        const id = match ? match[0] : `att-${index}`;

        const fileName = item.split("/").pop()?.split("?")[0] || "attachment";

        const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        return {
          id: id,
          url: item,
          original_name: fileName,
          mime_type: isImage ? "image/jpeg" : "application/octet-stream",
          file_size: 0,
          file_name: fileName,
        } as Media;
      }
      return item as Media;
    });
  }, [reportDetail]);

  const { images, files } = useMemo(() => {
    const images: Media[] = [];
    const files: Media[] = [];
    getAttachments.forEach((att: Media) => {
      if (att.mime_type?.startsWith("image/")) {
        images.push(att);
      } else {
        files.push(att);
      }
    });
    return { images, files };
  }, [getAttachments]);

  const slides = useMemo(
    () =>
      images.map((img) => ({
        src: img.url,
        alt: img.original_name,

        mediaId: img.id,
      })),
    [images]
  );

  const handleAttachmentRefresh = async (mediaId: string) => {
    if (!detailReportId) return;

    try {
      if (!mediaId || mediaId.startsWith("att-")) {
        throw new Error("Cannot refresh this attachment (missing ID)");
      }

      const newUrl = await mediaService.refreshMediaUrl(mediaId);

      queryClient.setQueryData(
        ["admin-report-detail", detailReportId],
        (oldData: ReportDetailResponse | undefined) => {
          if (!oldData || !oldData.evidence_snapshot) return oldData;

          const snapshot = oldData.evidence_snapshot;
          let updatedAttachments: (string | Media)[] = [];

          const rawAttachments = snapshot.attachments || snapshot.data?.attachments;

          if (rawAttachments) {
            updatedAttachments = rawAttachments.map((att: string | Media) => {
              if (typeof att === "string") {
                return att.includes(mediaId) ? newUrl : att;
              }
              return att.id === mediaId ? { ...att, url: newUrl } : att;
            });

            if (snapshot.attachments) {
              return {
                ...oldData,
                evidence_snapshot: {
                  ...snapshot,
                  attachments: updatedAttachments,
                },
              };
            } else if (snapshot.data?.attachments) {
              return {
                ...oldData,
                evidence_snapshot: {
                  ...snapshot,
                  data: {
                    ...snapshot.data,
                    attachments: updatedAttachments,
                  },
                },
              };
            }
          }
          return oldData;
        }
      );

      return newUrl;
    } catch (error) {
      console.error("Failed to refresh attachment", error);
      throw error;
    }
  };

  const handleDownload = async (file: Media) => {
    let currentUrl = file.url;
    if (!currentUrl) return;

    const downloadFile = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        const error = new Error(response.statusText) as Error & { status: number };
        error.status = response.status;
        throw error;
      }

      const blob = await response.blob();
      const uniqueUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = uniqueUrl;
      a.download = file.original_name || file.file_name || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(uniqueUrl);
      document.body.removeChild(a);
    };

    try {
      await downloadFile(currentUrl);
    } catch (error) {
      console.error("Download failed, attempting refresh...", error);

      try {
        const newUrl = await handleAttachmentRefresh(file.id);
        if (newUrl) {
          await downloadFile(newUrl);
        } else {
          throw new Error("Failed to refresh URL");
        }
      } catch (retryError) {
        console.error("Download failed after refresh", retryError);
        if (retryError instanceof Error && retryError.message === "File not found") {
          toast.error("File tidak ditemukan (mungkin sudah dihapus oleh server).", {
            id: "download-failed",
          });
        } else {
          toast.error("Gagal mendownload file.", { id: "download-failed" });
        }
      }
    }
  };

  const handleResolve = () => {
    if (selectedReport) {
      resolveMutation.mutate({
        id: selectedReport.id,
        status: "resolved",
        notes: resolveNotes,
      });
    }
  };

  const handleReject = () => {
    if (selectedReport) {
      resolveMutation.mutate({
        id: selectedReport.id,
        status: "rejected",
        notes: resolveNotes,
      });
    }
  };

  const handleUserAction = (userId: string, action: "view" | "ban" | "reset" | "unban") => {
    setActionUserId(userId);
    if (action === "view") {
      setUserReviewId(userId);
      setUserActionOpen(true);
    } else if (action === "ban") {
      setUserBanOpen(true);
    } else if (action === "reset") {
      setUserResetOpen(true);
    } else if (action === "unban") {
      setUserUnbanOpen(true);
    }
  };

  const reports = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">Manage and resolve user reports.</p>
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
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={cursorStack.length === 0 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!meta?.has_next || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

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
                    <Button variant="outline" onClick={() => refetch()}>
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
                          <DropdownMenuItem onClick={() => handleViewDetail(report.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReport(report);
                              setResolveOpen(true);
                            }}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Resolve
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReport(report);
                              setRejectOpen(true);
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetail(report.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0"
          onInteractOutside={(e) => {
            if (lightboxOpen) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (lightboxOpen) e.preventDefault();
          }}
        >
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Review the report information, target entity, and evidence.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {reportDetail ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wide">
                      Status
                    </span>
                    <Badge
                      variant={
                        reportDetail.status === "pending"
                          ? "outline"
                          : reportDetail.status === "resolved"
                            ? "default"
                            : "destructive"
                      }
                      className="mt-1"
                    >
                      {reportDetail.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wide">
                      Date
                    </span>
                    <span className="font-medium mt-1 block">
                      {format(new Date(reportDetail.created_at), "PPP p")}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs uppercase tracking-wide">
                      Reason
                    </span>
                    <span className="font-medium mt-1 block">{reportDetail.reason}</span>
                    {reportDetail.description && (
                      <p className="text-muted-foreground text-xs mt-1">
                        "{reportDetail.description}"
                      </p>
                    )}
                  </div>
                </div>

                <ReportAssociatedEntity
                  id={reportDetail.reporter_id}
                  type="user"
                  isDeleted={reportDetail.reporter_is_deleted}
                  isBanned={reportDetail.reporter_is_banned}
                  label="Reporter"
                  onUserAction={handleUserAction}
                />

                <div className="space-y-6">
                  <h3 className="font-semibold text-base">Reported Content</h3>

                  {reportDetail.target_type === "message" && (
                    <>
                      <ReportAssociatedEntity
                        id={reportDetail.evidence_snapshot?.sender_id}
                        type="user"
                        isDeleted={false}
                        isBanned={reportDetail.target_is_banned}
                        label="Message Sender"
                        onUserAction={handleUserAction}
                      />

                      <div className="bg-muted p-3 rounded-md border flex flex-col gap-3">
                        <p className="text-xs text-muted-foreground uppercase">Message Content</p>

                        {reportDetail.evidence_snapshot?.content && (
                          <p className="text-sm whitespace-pre-wrap">
                            {reportDetail.evidence_snapshot.content}
                          </p>
                        )}

                        {files.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {files.map((att) => (
                              <AttachmentCard
                                key={att.id}
                                file={att}
                                isSender={false}
                                onClick={() => handleDownload(att)}
                                onRefresh={async (id) => {
                                  await handleAttachmentRefresh(id);
                                }}
                              />
                            ))}
                          </div>
                        )}

                        {images.length > 0 && (
                          <div
                            className={`grid gap-1 overflow-hidden rounded-md max-w-full w-full ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
                          >
                            {images.map((item, index) => {
                              const isSingle = images.length === 1;
                              const isThree = images.length === 3;
                              const isHero = isThree && index === 0;

                              const isMultiOdd = images.length > 1 && images.length % 2 !== 0;
                              const isFooter =
                                !isThree && isMultiOdd && index === images.length - 1;

                              const spanClass =
                                isHero || isFooter
                                  ? "col-span-2 aspect-[2/1]"
                                  : "col-span-1 aspect-square";

                              const singleClass = "col-span-1 aspect-square";

                              return (
                                <div
                                  key={item.id}
                                  className={`relative overflow-hidden rounded-md bg-muted ${isSingle ? singleClass : spanClass}`}
                                >
                                  <AttachmentCard
                                    file={item}
                                    isSender={false}
                                    onClick={() => {}}
                                    onImageClick={() => {
                                      setLightboxIndex(index);
                                      setLightboxOpen(true);
                                    }}
                                    onRefresh={async (id) => {
                                      await handleAttachmentRefresh(id);
                                    }}
                                  />
                                  <div className="absolute inset-0 rounded-md ring-1 ring-inset pointer-events-none ring-primary/20" />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!reportDetail.evidence_snapshot?.content &&
                          getAttachments.length === 0 && (
                            <p className="text-sm italic text-muted-foreground">[No Content]</p>
                          )}
                      </div>

                      {/* Group Context (if group chat) */}
                      {reportDetail.evidence_snapshot?.chat_type === "group" && (
                        <ReportAssociatedEntity
                          id={reportDetail.evidence_snapshot?.group_id}
                          type="group"
                          isDeleted={false}
                          label="Context: Group Chat"
                          onUserAction={handleUserAction}
                        />
                      )}
                    </>
                  )}

                  {reportDetail.target_type === "user" && (
                    <ReportAssociatedEntity
                      id={reportDetail.target_id || ""}
                      type="user"
                      isDeleted={reportDetail.target_is_deleted}
                      isBanned={reportDetail.target_is_banned}
                      label="Reported User"
                      onUserAction={handleUserAction}
                    />
                  )}

                  {reportDetail.target_type === "group" && (
                    <ReportAssociatedEntity
                      id={reportDetail.target_id || ""}
                      type="group"
                      isDeleted={reportDetail.target_is_deleted}
                      label="Reported Group"
                      onUserAction={handleUserAction}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                Failed to load report details.
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {reportDetail?.status === "pending" && (
            <div className="p-4 border-t flex justify-end gap-2 bg-background">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedReport(reportDetail as any);
                  setRejectOpen(true);
                }}
              >
                Reject
              </Button>
              <Button
                onClick={() => {
                  setSelectedReport(reportDetail as any);
                  setResolveOpen(true);
                }}
              >
                Resolve
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Mark this report as resolved. You can add notes about the action taken.
            </DialogDescription>
          </DialogHeader>

          {selectedReport?.target_type === "message" && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Warning: Resolving this report will{" "}
                <strong>permanently delete the reported message content</strong>.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Action taken (e.g., User banned, content removed)..."
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveOpen(false)}
              disabled={resolveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
              className="relative"
            >
              <span className={resolveMutation.isPending ? "opacity-0" : ""}>Resolve Report</span>
              {resolveMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="size-4 text-primary-foreground" />
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent
          onInteractOutside={(e) => resolveMutation.isPending && e.preventDefault()}
          onEscapeKeyDown={(e) => resolveMutation.isPending && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Reject Report</DialogTitle>
            <DialogDescription>
              Reject this report if it's invalid or requires no action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection..."
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={resolveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={resolveMutation.isPending}
              className="relative"
            >
              <span className={resolveMutation.isPending ? "opacity-0" : ""}>Reject Report</span>
              {resolveMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="size-4 text-primary-foreground" />
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Action Dialogs */}
      <UserDetailDialog
        open={userActionOpen}
        onOpenChange={setUserActionOpen}
        userId={userReviewId}
      />
      <UserBanDialog
        open={userBanOpen}
        onOpenChange={setUserBanOpen}
        userId={actionUserId}
        onSuccess={() => {
          if (actionUserId) handleBanSuccess(actionUserId);
          setActionUserId(null);
        }}
      />
      <UserUnbanDialog
        open={userUnbanOpen}
        onOpenChange={setUserUnbanOpen}
        userId={actionUserId}
        onSuccess={() => {
          if (actionUserId) handleUnbanSuccess(actionUserId);
          setActionUserId(null);
        }}
      />
      <UserResetDialog open={userResetOpen} onOpenChange={setUserResetOpen} userId={actionUserId} />

      <LoadingModal isOpen={isFetchingDetail} />
      <GlobalLightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
        showThumbnails={true}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
