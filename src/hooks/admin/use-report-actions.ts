import { useDeleteReport } from "@/hooks/mutations/use-delete-report";
import { errorLog } from "@/lib/logger";
import { toast } from "@/lib/toast";
import { ReportDetailResponse, ReportListResponse, adminService } from "@/services/admin.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useReportActions() {
  const queryClient = useQueryClient();

  const [detailReportId, setDetailReportId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [selectedReport, setSelectedReport] = useState<
    ReportListResponse | ReportDetailResponse | null
  >(null);

  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteReportMutation = useDeleteReport();

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
      errorLog(error);
    } finally {
      setIsFetchingDetail(false);
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

  const handleDeleteReport = () => {
    if (deleteReportId) {
      deleteReportMutation.mutate(deleteReportId, {
        onSuccess: () => {
          setDeleteOpen(false);
          setDeleteReportId(null);
        },
      });
    }
  };

  return {
    detailState: {
      detailReportId,
      setDetailReportId,
      detailOpen,
      setDetailOpen,
      isFetchingDetail,
      reportDetail,
      handleViewDetail,
    },
    actionState: {
      resolveOpen,
      setResolveOpen,
      rejectOpen,
      setRejectOpen,
      resolveNotes,
      setResolveNotes,
      selectedReport,
      setSelectedReport,
      handleResolve,
      handleReject,
      isPending: resolveMutation.isPending,
    },
    deleteState: {
      deleteReportId,
      setDeleteReportId,
      deleteOpen,
      setDeleteOpen,
      handleDeleteReport,
      isDeletePending: deleteReportMutation.isPending,
    },
  };
}
