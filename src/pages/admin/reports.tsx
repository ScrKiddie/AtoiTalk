import {
  UserBanDialog,
  UserDetailDialog,
  UserResetDialog,
  UserUnbanDialog,
} from "@/components/admin/user-action-dialogs";
import { LoadingModal } from "@/components/ui/loading-modal";

import { ReportActionDialogs } from "@/components/admin/reports/report-action-dialogs";
import { ReportDetailDialog } from "@/components/admin/reports/report-detail-dialog";
import { ReportFilters } from "@/components/admin/reports/report-filters";
import { ReportHeader } from "@/components/admin/reports/report-header";
import { ReportListTable } from "@/components/admin/reports/report-list-table";

import { GlobalLightbox } from "@/components/ui/lightbox";
import { useReportActions } from "@/hooks/admin/use-report-actions";
import { useReportManagement } from "@/hooks/admin/use-report-management";
import { useReportMedia } from "@/hooks/admin/use-report-media";
import { useUserManagement } from "@/hooks/admin/use-user-management";
import { useState } from "react";

export default function AdminReports() {
  const { reports, meta, isLoading, isError, error, refetch, filterState, pagination } =
    useReportManagement();

  const { detailState, actionState, deleteState } = useReportActions();

  const { state: userState, actions: userActions } = useUserManagement(detailState.detailReportId);

  const { slides } = useReportMedia(detailState.reportDetail, detailState.detailReportId);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  return (
    <div className="space-y-6">
      <ReportHeader isLoading={isLoading} onRefresh={() => refetch()} />

      <ReportFilters
        search={filterState.search}
        onSearchChange={filterState.setSearch}
        statusFilter={filterState.statusFilter}
        onStatusChange={filterState.setStatusFilter}
        isLoading={isLoading}
        hasPrev={pagination.cursorStack.length > 0}
        hasNext={!!meta?.has_next}
        onPrevPage={pagination.handlePrevPage}
        onNextPage={pagination.handleNextPage}
      />

      <ReportListTable
        reports={reports}
        isLoading={isLoading}
        isError={isError}
        error={error as Error}
        onRefetch={() => refetch()}
        onViewDetail={detailState.handleViewDetail}
        onResolve={(report) => {
          actionState.setSelectedReport(report);
          actionState.setResolveOpen(true);
        }}
        onReject={(report) => {
          actionState.setSelectedReport(report);
          actionState.setRejectOpen(true);
        }}
        onDelete={(id) => {
          deleteState.setDeleteReportId(id);
          deleteState.setDeleteOpen(true);
        }}
      />

      <ReportDetailDialog
        open={detailState.detailOpen}
        onOpenChange={detailState.setDetailOpen}
        reportDetail={detailState.reportDetail}
        isLoading={detailState.isFetchingDetail}
        onUserAction={userActions.handleUserAction}
        onResolve={(report) => {
          actionState.setSelectedReport(report);
          actionState.setResolveOpen(true);
        }}
        onReject={(report) => {
          actionState.setSelectedReport(report);
          actionState.setRejectOpen(true);
        }}
        onImageClick={(index) => {
          setLightboxIndex(index);
          setLightboxOpen(true);
        }}
        isLightboxOpen={lightboxOpen}
      />

      <ReportActionDialogs
        resolveOpen={actionState.resolveOpen}
        onResolveOpenChange={actionState.setResolveOpen}
        rejectOpen={actionState.rejectOpen}
        onRejectOpenChange={actionState.setRejectOpen}
        deleteOpen={deleteState.deleteOpen}
        onDeleteOpenChange={deleteState.setDeleteOpen}
        resolveNotes={actionState.resolveNotes}
        onResolveNotesChange={actionState.setResolveNotes}
        selectedReport={actionState.selectedReport}
        onResolve={actionState.handleResolve}
        onReject={actionState.handleReject}
        onDelete={deleteState.handleDeleteReport}
        isPending={actionState.isPending}
        isDeletePending={deleteState.isDeletePending}
      />

      <UserDetailDialog
        open={userState.userActionOpen}
        onOpenChange={userState.setUserActionOpen}
        userId={userState.userReviewId}
      />

      <UserBanDialog
        open={userState.userBanOpen}
        onOpenChange={userState.setUserBanOpen}
        userId={userState.actionUserId}
        onSuccess={() => {
          if (userState.actionUserId) {
            userActions.handleBanSuccess(userState.actionUserId);
            userState.setActionUserId(null);
          }
        }}
      />

      <UserUnbanDialog
        open={userState.userUnbanOpen}
        onOpenChange={userState.setUserUnbanOpen}
        userId={userState.actionUserId}
        onSuccess={() => {
          if (userState.actionUserId) {
            userActions.handleUnbanSuccess(userState.actionUserId);
            userState.setActionUserId(null);
          }
        }}
      />

      <UserResetDialog
        open={userState.userResetOpen}
        onOpenChange={userState.setUserResetOpen}
        userId={userState.actionUserId}
      />

      <LoadingModal isOpen={detailState.isFetchingDetail} />

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
