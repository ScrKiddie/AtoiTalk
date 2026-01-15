import api from "@/lib/axios";
import type {
  ApiResponse,
  AuthResponse,
  ChangeEmailRequest,
  ChangePasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  RegisterUserRequest,
  ResetPasswordRequest,
} from "@/types";

/**
 * Auth Service - handles authentication API calls
 */
export const authService = {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>("/api/auth/login", data);
    return response.data.data;
  },

  /**
   * Register a new user
   */
  async register(data: RegisterUserRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>("/api/auth/register", data);
    return response.data.data;
  },

  /**
   * Login with Google OAuth
   */
  async googleLogin(data: GoogleLoginRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>("/api/auth/google", data);
    return response.data.data;
  },

  /**
   * Reset password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await api.post("/api/auth/reset-password", data);
  },

  /**
   * Change email (requires OTP)
   */
  async changeEmail(data: ChangeEmailRequest): Promise<void> {
    await api.put("/api/account/email", data);
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.put("/api/account/password", data);
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await api.post("/api/auth/logout");
  },
};

export default authService;
