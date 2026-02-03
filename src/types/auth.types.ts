import { User } from "./user.types";

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  captcha_token: string;
}

/**
 * Register user request payload
 */
export interface RegisterUserRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
  code: string;
  captcha_token: string;
}

/**
 * Google login request payload
 */
export interface GoogleLoginRequest {
  code: string;
}

/**
 * Reset password request payload
 */
export interface ResetPasswordRequest {
  email: string;
  password: string;
  confirm_password: string;
  code: string;
  captcha_token: string;
}

/**
 * Change email request payload
 */
export interface ChangeEmailRequest {
  email: string;
  code: string;
}

/**
 * Change password request payload
 */
export interface ChangePasswordRequest {
  old_password?: string;
  new_password: string;
  confirm_password: string;
}

/**
 * Authentication response with token and user
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Delete account request payload
 */
export interface DeleteAccountRequest {
  password?: string;
}
