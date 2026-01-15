/**
 * OTP mode for different purposes
 */
export type OTPMode = "register" | "reset" | "change_email";

/**
 * Send OTP request payload
 */
export interface SendOTPRequest {
  email: string;
  mode: OTPMode;
  captcha_token: string;
}
