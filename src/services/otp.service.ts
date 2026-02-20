import api from "@/lib/axios";
import type { SendOTPRequest } from "@/types";

/** API calls for OTP delivery */
export const otpService = {
  /**
   * Send OTP to email for verification
   */
  async sendOTP(data: SendOTPRequest): Promise<void> {
    await api.post("/api/otp/send", data);
  },
};

export default otpService;
