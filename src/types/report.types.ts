export type ReportTargetType = "message" | "group" | "user";

export interface CreateReportRequest {
  target_type: ReportTargetType;
  reason: string;
  description?: string;
  message_id?: string;
  group_id?: string;
  target_user_id?: string;
}

export interface ReportResponse {
  id: string;
  target_type: ReportTargetType;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
}
