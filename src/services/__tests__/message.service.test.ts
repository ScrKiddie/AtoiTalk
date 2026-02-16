import { beforeEach, describe, expect, it, vi } from "vitest";
import { messageService } from "../message.service";

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

describe("messageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMessages", () => {
    it("calls GET /api/chats/:chatId/messages with params", async () => {
      const mockData = { data: [], meta: { has_next: false } };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await messageService.getMessages("chat-1", { limit: 30 });

      expect(mockApi.get).toHaveBeenCalledWith("/api/chats/chat-1/messages", {
        params: { limit: 30 },
        signal: undefined,
      });
      expect(result).toEqual(mockData);
    });

    it("passes signal for abort support", async () => {
      const signal = new AbortController().signal;
      mockApi.get.mockResolvedValue({ data: { data: [], meta: {} } });

      await messageService.getMessages("chat-1", {}, signal);

      expect(mockApi.get).toHaveBeenCalledWith("/api/chats/chat-1/messages", {
        params: {},
        signal,
      });
    });
  });

  describe("sendMessage", () => {
    it("calls POST /api/messages and returns data", async () => {
      const newMsg = { id: "msg-1", content: "Hello" };
      mockApi.post.mockResolvedValue({ data: { data: newMsg } });

      const result = await messageService.sendMessage({
        chat_id: "chat-1",
        content: "Hello",
      });

      expect(mockApi.post).toHaveBeenCalledWith("/api/messages", {
        chat_id: "chat-1",
        content: "Hello",
      });
      expect(result).toEqual(newMsg);
    });
  });

  describe("deleteMessage", () => {
    it("calls DELETE /api/messages/:messageId", async () => {
      mockApi.delete.mockResolvedValue({});

      await messageService.deleteMessage("msg-1");

      expect(mockApi.delete).toHaveBeenCalledWith("/api/messages/msg-1");
    });
  });

  describe("editMessage", () => {
    it("calls PUT /api/messages/:messageId and returns data", async () => {
      const edited = { id: "msg-1", content: "Edited" };
      mockApi.put.mockResolvedValue({ data: { data: edited } });

      const result = await messageService.editMessage("msg-1", { content: "Edited" });

      expect(mockApi.put).toHaveBeenCalledWith("/api/messages/msg-1", { content: "Edited" });
      expect(result).toEqual(edited);
    });
  });
});
