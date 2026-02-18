import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useUserManagement(detailReportId: string | null) {
  const queryClient = useQueryClient();

  const [userActionOpen, setUserActionOpen] = useState(false);
  const [userReviewId, setUserReviewId] = useState<string | null>(null);
  const [userBanOpen, setUserBanOpen] = useState(false);
  const [userUnbanOpen, setUserUnbanOpen] = useState(false);
  const [userResetOpen, setUserResetOpen] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

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

  const handleUnbanSuccess = (targetUserId: string) => {
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    if (detailReportId) {
      queryClient.invalidateQueries({ queryKey: ["admin-report-detail", detailReportId] });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", targetUserId] });
    queryClient.invalidateQueries({ queryKey: ["admin-group-members-infinite"] });
  };

  const handleBanSuccess = (targetUserId: string) => {
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    if (detailReportId) {
      queryClient.invalidateQueries({ queryKey: ["admin-report-detail", detailReportId] });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", targetUserId] });
    queryClient.invalidateQueries({ queryKey: ["admin-group-members-infinite"] });
  };

  return {
    state: {
      userActionOpen,
      setUserActionOpen,
      userReviewId,
      userBanOpen,
      setUserBanOpen,
      userUnbanOpen,
      setUserUnbanOpen,
      userResetOpen,
      setUserResetOpen,
      actionUserId,
      setActionUserId,
    },
    actions: {
      handleUserAction,
      handleBanSuccess,
      handleUnbanSuccess,
    },
  };
}
