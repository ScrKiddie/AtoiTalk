import { api } from "@/lib/axios";
import { CreateReportRequest, ReportResponse } from "@/types";
import { ApiResponse } from "@/types/api";

/**
 * Report Service - handles report-related API calls
 */
export const reportService = {
  /**
   * Create a new report
   */
  createReport: async (data: CreateReportRequest): Promise<ReportResponse> => {
    const response = await api.post<ApiResponse<ReportResponse>>("/api/reports", data);
    return response.data.data;
  },
};
