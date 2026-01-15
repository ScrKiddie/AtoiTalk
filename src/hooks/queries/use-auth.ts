import { authService } from "@/services";
import { useAuthStore, useUIStore } from "@/store";
import type {
  ApiError,
  AuthResponse,
  ChangeEmailRequest,
  ChangePasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  RegisterUserRequest,
  ResetPasswordRequest,
} from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export function useLogin() {
  const setCredentials = useAuthStore((state) => state.setCredentials);

  return useMutation<AuthResponse, AxiosError<ApiError, unknown>, LoginRequest>({
    mutationFn: (data) => authService.login(data),
    retry: false,
    onSuccess: (response) => {
      useUIStore.getState().setGlobalLoading(true, "Logging In");
      setCredentials(response.token, response.user);
    },
  });
}

export function useRegister() {
  return useMutation<AuthResponse, AxiosError<ApiError, unknown>, RegisterUserRequest>({
    mutationFn: (data) => authService.register(data),
    retry: false,
  });
}

export function useGoogleLogin() {
  const setCredentials = useAuthStore((state) => state.setCredentials);

  return useMutation<AuthResponse, AxiosError<ApiError, unknown>, GoogleLoginRequest>({
    mutationFn: (data) => authService.googleLogin(data),
    retry: false,
    onSuccess: (response) => {
      useUIStore.getState().setGlobalLoading(true, "Logging In");
      setCredentials(response.token, response.user);
    },
  });
}

export function useResetPassword() {
  return useMutation<void, AxiosError<ApiError, unknown>, ResetPasswordRequest>({
    mutationFn: (data) => authService.resetPassword(data),
    retry: false,
  });
}

export function useChangeEmail() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiError, unknown>, ChangeEmailRequest>({
    mutationFn: (data) => authService.changeEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "current"] });
    },
  });
}

export function useChangePassword() {
  return useMutation<void, AxiosError<ApiError, unknown>, ChangePasswordRequest>({
    mutationFn: (data) => authService.changePassword(data),
    retry: (failureCount, error) => {
      if (error.response?.status === 400) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      logout();
      queryClient.clear();
    }
  };
}
