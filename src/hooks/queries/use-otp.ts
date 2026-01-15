import { otpService } from "@/services";
import type { ApiError, SendOTPRequest } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";

export function useSendOTP() {
  return useMutation<void, AxiosError<ApiError, unknown>, SendOTPRequest>({
    mutationFn: (data: SendOTPRequest) => otpService.sendOTP(data),
    retry: false,
  });
}
