import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminService } from "../admin.service";

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

import { api } from "@/lib/axios";
const mockApi = vi.mocked(api);

describe("adminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardStats", () => {
    it("calls GET /api/admin/dashboard", async () => {
      const stats = { total_users: 10, total_messages: 100, total_groups: 5, active_reports: 2 };
      mockApi.get.mockResolvedValue({ data: { data: stats } });

      const result = await adminService.getDashboardStats();

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/dashboard");
      expect(result).toEqual(stats);
    });
  });

  describe("getUsers", () => {
    it("calls GET /api/admin/users with params", async () => {
      const data = { data: [], meta: { has_next: false } };
      mockApi.get.mockResolvedValue({ data });

      const result = await adminService.getUsers({ query: "john", limit: 20 });

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/users", {
        params: { query: "john", limit: 20 },
      });
      expect(result).toEqual(data);
    });
  });

  describe("getUser", () => {
    it("calls GET /api/admin/users/:userId", async () => {
      const user = { id: "u1", full_name: "Test" };
      mockApi.get.mockResolvedValue({ data: { data: user } });

      const result = await adminService.getUser("u1");

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/users/u1");
      expect(result).toEqual(user);
    });
  });

  describe("banUser", () => {
    it("calls POST /api/admin/users/ban", async () => {
      mockApi.post.mockResolvedValue({ data: {} });

      await adminService.banUser({
        target_user_id: "u2",
        reason: "spam",
        duration_hours: 24,
      });

      expect(mockApi.post).toHaveBeenCalledWith("/api/admin/users/ban", {
        target_user_id: "u2",
        reason: "spam",
        duration_hours: 24,
      });
    });
  });

  describe("unbanUser", () => {
    it("calls POST /api/admin/users/:userId/unban", async () => {
      mockApi.post.mockResolvedValue({ data: {} });

      await adminService.unbanUser("u2");

      expect(mockApi.post).toHaveBeenCalledWith("/api/admin/users/u2/unban");
    });
  });

  describe("resetUserInfo", () => {
    it("calls POST /api/admin/users/:userId/reset with target_user_id", async () => {
      mockApi.post.mockResolvedValue({ data: {} });

      await adminService.resetUserInfo("u2", { reset_avatar: true, reset_bio: true });

      expect(mockApi.post).toHaveBeenCalledWith("/api/admin/users/u2/reset", {
        reset_avatar: true,
        reset_bio: true,
        target_user_id: "u2",
      });
    });
  });

  describe("getGroups", () => {
    it("calls GET /api/admin/groups with params", async () => {
      const data = { data: [], meta: { has_next: false } };
      mockApi.get.mockResolvedValue({ data });

      const result = await adminService.getGroups({ query: "study" });

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/groups", {
        params: { query: "study" },
      });
      expect(result).toEqual(data);
    });
  });

  describe("getGroupDetail", () => {
    it("calls GET /api/admin/groups/:chatId", async () => {
      const group = { id: "g1", name: "Group", chat_id: "c1" };
      mockApi.get.mockResolvedValue({ data: { data: group } });

      const result = await adminService.getGroupDetail("c1");

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/groups/c1");
      expect(result).toEqual(group);
    });
  });

  describe("getGroupMembers", () => {
    it("calls GET /api/admin/groups/:chatId/members with params", async () => {
      const data = { data: [], meta: { has_next: false } };
      mockApi.get.mockResolvedValue({ data });

      const result = await adminService.getGroupMembers("c1", { query: "john" });

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/groups/c1/members", {
        params: { query: "john" },
      });
      expect(result).toEqual(data);
    });
  });

  describe("getGroupMembersInfinite", () => {
    it("calls GET /api/admin/groups/:chatId/members with cursor", async () => {
      const data = { data: [], meta: { has_next: false } };
      mockApi.get.mockResolvedValue({ data });

      const result = await adminService.getGroupMembersInfinite({
        queryKey: ["admin-group-members", "c1", "john"],
        pageParam: "cursor-abc",
      });

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/groups/c1/members", {
        params: { query: "john", cursor: "cursor-abc", limit: 10 },
      });
      expect(result).toEqual(data);
    });
  });

  describe("resetGroupInfo", () => {
    it("calls POST /api/admin/groups/:chatId/reset", async () => {
      mockApi.post.mockResolvedValue({ data: {} });

      await adminService.resetGroupInfo("c1", { reset_name: true });

      expect(mockApi.post).toHaveBeenCalledWith("/api/admin/groups/c1/reset", {
        reset_name: true,
      });
    });
  });

  describe("dissolveGroup", () => {
    it("calls DELETE /api/admin/groups/:chatId", async () => {
      mockApi.delete.mockResolvedValue({ data: {} });

      await adminService.dissolveGroup("c1");

      expect(mockApi.delete).toHaveBeenCalledWith("/api/admin/groups/c1");
    });
  });

  describe("getReports", () => {
    it("calls GET /api/admin/reports with params", async () => {
      const data = { data: [], meta: { has_next: false } };
      mockApi.get.mockResolvedValue({ data });

      const result = await adminService.getReports({ status: "pending" });

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/reports", {
        params: { status: "pending" },
      });
      expect(result).toEqual(data);
    });
  });

  describe("getReportDetail", () => {
    it("calls GET /api/admin/reports/:reportId", async () => {
      const report = { id: "r1", reason: "spam" };
      mockApi.get.mockResolvedValue({ data: { data: report } });

      const result = await adminService.getReportDetail("r1");

      expect(mockApi.get).toHaveBeenCalledWith("/api/admin/reports/r1");
      expect(result).toEqual(report);
    });
  });

  describe("resolveReport", () => {
    it("calls PUT /api/admin/reports/:reportId/resolve", async () => {
      mockApi.put.mockResolvedValue({ data: {} });

      await adminService.resolveReport("r1", { status: "resolved", notes: "Done" });

      expect(mockApi.put).toHaveBeenCalledWith("/api/admin/reports/r1/resolve", {
        status: "resolved",
        notes: "Done",
      });
    });

    it("supports rejected status", async () => {
      mockApi.put.mockResolvedValue({ data: {} });

      await adminService.resolveReport("r1", { status: "rejected" });

      expect(mockApi.put).toHaveBeenCalledWith("/api/admin/reports/r1/resolve", {
        status: "rejected",
      });
    });
  });
});
