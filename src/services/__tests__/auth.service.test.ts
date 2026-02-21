import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "../auth.service";

vi.mock("@/lib/axios", () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockApi, api: mockApi };
});

import api from "@/lib/axios";
const mockApi = vi.mocked(api);

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("login", () => {
    it("calls POST /api/auth/login and returns data", async () => {
      const mockResponse = {
        data: { data: { token: "jwt-token", user: { id: "u1" } } },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authService.login({
        email: "test@mail.com",
        password: "pass",
        captcha_token: "token",
      });

      expect(mockApi.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "test@mail.com",
        password: "pass",
        captcha_token: "token",
      });
      expect(result).toEqual({ token: "jwt-token", user: { id: "u1" } });
    });
  });

  describe("register", () => {
    it("calls POST /api/auth/register and returns data", async () => {
      const mockResponse = {
        data: { data: { token: "jwt-token", user: { id: "u2" } } },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authService.register({
        full_name: "Test",
        username: "test",
        email: "test@mail.com",
        password: "Pass123!",
        captcha_token: "token",
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          email: "test@mail.com",
        })
      );
      expect(result).toEqual({ token: "jwt-token", user: { id: "u2" } });
    });
  });

  describe("initGoogleAuth", () => {
    it("calls GET /api/auth/google/init", async () => {
      const mockResponse = {
        data: { data: { auth_url: "url", state: "state", expires_in_seconds: 300 } },
      };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await authService.initGoogleAuth();

      expect(mockApi.get).toHaveBeenCalledWith("/api/auth/google/init");
      expect(result).toEqual({ auth_url: "url", state: "state", expires_in_seconds: 300 });
    });
  });

  describe("googleLogin", () => {
    it("calls POST /api/auth/google", async () => {
      const mockResponse = {
        data: { data: { token: "google-jwt", user: { id: "u3" } } },
      };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authService.googleLogin({ code: "code123", state: "state123" });

      expect(mockApi.post).toHaveBeenCalledWith("/api/auth/google", {
        code: "code123",
        state: "state123",
      });
      expect(result).toEqual({ token: "google-jwt", user: { id: "u3" } });
    });
  });

  describe("resetPassword", () => {
    it("calls POST /api/auth/reset-password", async () => {
      mockApi.post.mockResolvedValue({});

      await authService.resetPassword({
        email: "test@mail.com",
        otp: "123456",
        new_password: "NewPass1!",
        captcha_token: "token",
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        expect.objectContaining({
          email: "test@mail.com",
        })
      );
    });
  });

  describe("changeEmail", () => {
    it("calls PUT /api/account/email", async () => {
      mockApi.put.mockResolvedValue({});

      await authService.changeEmail({
        new_email: "new@mail.com",
        otp: "123456",
      });

      expect(mockApi.put).toHaveBeenCalledWith("/api/account/email", {
        new_email: "new@mail.com",
        otp: "123456",
      });
    });
  });

  describe("changePassword", () => {
    it("calls PUT /api/account/password", async () => {
      mockApi.put.mockResolvedValue({});

      await authService.changePassword({
        current_password: "OldPass1!",
        new_password: "NewPass1!",
      });

      expect(mockApi.put).toHaveBeenCalledWith("/api/account/password", {
        current_password: "OldPass1!",
        new_password: "NewPass1!",
      });
    });
  });

  describe("deleteAccount", () => {
    it("calls DELETE /api/account with data", async () => {
      mockApi.delete.mockResolvedValue({});

      await authService.deleteAccount({ password: "Pass123!" });

      expect(mockApi.delete).toHaveBeenCalledWith("/api/account", {
        data: { password: "Pass123!" },
      });
    });
  });

  describe("logout", () => {
    it("calls POST /api/auth/logout", async () => {
      mockApi.post.mockResolvedValue({});

      await authService.logout();

      expect(mockApi.post).toHaveBeenCalledWith("/api/auth/logout");
    });
  });
});
