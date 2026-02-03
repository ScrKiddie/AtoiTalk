import { reportService } from "@/services";
import { CreateReportRequest } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

interface ErrorResponse {
  error: string;
}

export function useReport() {
  return useMutation({
    mutationFn: (data: CreateReportRequest) => reportService.createReport(data),
    onSuccess: () => {
      toast.success("Report submitted successfully");
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      toast.error(error.response?.data?.error || "Failed to submit report");
    },
  });
}
