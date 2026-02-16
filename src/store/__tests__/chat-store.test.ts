import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore } from "../index";

describe("useChatStore", () => {
  beforeEach(() => {
    useChatStore.setState({
      activeChatId: null,
      isJumped: false,
      typingUsers: {},
      onlineUsers: new Set(),
      recentlyDeletedChatIds: new Set(),
      searchQuery: "",
    });
  });

  describe("setActiveChatId", () => {
    it("sets the active chat ID", () => {
      useChatStore.getState().setActiveChatId("chat-1");
      expect(useChatStore.getState().activeChatId).toBe("chat-1");
    });

    it("sets to null", () => {
      useChatStore.getState().setActiveChatId("chat-1");
      useChatStore.getState().setActiveChatId(null);
      expect(useChatStore.getState().activeChatId).toBeNull();
    });
  });

  describe("setIsJumped", () => {
    it("sets jumped state", () => {
      useChatStore.getState().setIsJumped(true);
      expect(useChatStore.getState().isJumped).toBe(true);
    });

    it("resets jumped state", () => {
      useChatStore.getState().setIsJumped(true);
      useChatStore.getState().setIsJumped(false);
      expect(useChatStore.getState().isJumped).toBe(false);
    });
  });

  describe("setSearchQuery", () => {
    it("sets search query", () => {
      useChatStore.getState().setSearchQuery("hello");
      expect(useChatStore.getState().searchQuery).toBe("hello");
    });

    it("clears search query", () => {
      useChatStore.getState().setSearchQuery("hello");
      useChatStore.getState().setSearchQuery("");
      expect(useChatStore.getState().searchQuery).toBe("");
    });
  });

  describe("setUserTyping", () => {
    it("adds a typing user to a chat", () => {
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      expect(useChatStore.getState().typingUsers["chat-1"]).toEqual(["user-a"]);
    });

    it("removes a typing user from a chat", () => {
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      useChatStore.getState().setUserTyping("chat-1", "user-a", false);
      expect(useChatStore.getState().typingUsers["chat-1"]).toBeUndefined();
    });

    it("does not add duplicate typing users", () => {
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      expect(useChatStore.getState().typingUsers["chat-1"]).toEqual(["user-a"]);
    });

    it("tracks multiple users typing in the same chat", () => {
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      useChatStore.getState().setUserTyping("chat-1", "user-b", true);
      expect(useChatStore.getState().typingUsers["chat-1"]).toEqual(["user-a", "user-b"]);
    });

    it("cleans up empty chat entries", () => {
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      useChatStore.getState().setUserTyping("chat-1", "user-a", false);
      expect("chat-1" in useChatStore.getState().typingUsers).toBe(false);
    });

    it("tracks typing across different chats", () => {
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      useChatStore.getState().setUserTyping("chat-2", "user-b", true);
      expect(useChatStore.getState().typingUsers["chat-1"]).toEqual(["user-a"]);
      expect(useChatStore.getState().typingUsers["chat-2"]).toEqual(["user-b"]);
    });
  });

  describe("clearUserTypingGlobal", () => {
    it("removes user typing from all chats", () => {
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      useChatStore.getState().setUserTyping("chat-2", "user-a", true);
      useChatStore.getState().setUserTyping("chat-2", "user-b", true);

      useChatStore.getState().clearUserTypingGlobal("user-a");

      expect(useChatStore.getState().typingUsers["chat-1"]).toBeUndefined();
      expect(useChatStore.getState().typingUsers["chat-2"]).toEqual(["user-b"]);
    });

    it("no-op when user is not typing anywhere", () => {
      useChatStore.getState().setUserTyping("chat-1", "user-a", true);
      useChatStore.getState().clearUserTypingGlobal("user-b");
      expect(useChatStore.getState().typingUsers["chat-1"]).toEqual(["user-a"]);
    });
  });

  describe("setUserOnline", () => {
    it("adds user to online set", () => {
      useChatStore.getState().setUserOnline("user-a", true);
      expect(useChatStore.getState().onlineUsers.has("user-a")).toBe(true);
    });

    it("removes user from online set", () => {
      useChatStore.getState().setUserOnline("user-a", true);
      useChatStore.getState().setUserOnline("user-a", false);
      expect(useChatStore.getState().onlineUsers.has("user-a")).toBe(false);
    });

    it("tracks multiple online users", () => {
      useChatStore.getState().setUserOnline("user-a", true);
      useChatStore.getState().setUserOnline("user-b", true);
      expect(useChatStore.getState().onlineUsers.size).toBe(2);
    });
  });

  describe("addDeletedChatId / removeDeletedChatId", () => {
    it("adds a deleted chat ID", () => {
      useChatStore.getState().addDeletedChatId("chat-1");
      expect(useChatStore.getState().recentlyDeletedChatIds.has("chat-1")).toBe(true);
    });

    it("removes a deleted chat ID", () => {
      useChatStore.getState().addDeletedChatId("chat-1");
      useChatStore.getState().removeDeletedChatId("chat-1");
      expect(useChatStore.getState().recentlyDeletedChatIds.has("chat-1")).toBe(false);
    });

    it("tracks multiple deleted chat IDs", () => {
      useChatStore.getState().addDeletedChatId("chat-1");
      useChatStore.getState().addDeletedChatId("chat-2");
      expect(useChatStore.getState().recentlyDeletedChatIds.size).toBe(2);
    });
  });
});
