import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "../index";

describe("useAuthStore", () => {
  const mockUser = {
    id: "user-1",
    full_name: "Test User",
    username: "testuser",
    email: "test@example.com",
    avatar: null,
    bio: "",
    is_online: true,
    last_seen_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  afterEach(() => {
    useAuthStore.getState().logout();
  });

  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("setCredentials sets token, user, and isAuthenticated", () => {
    useAuthStore.getState().setCredentials("my-token", mockUser);
    const state = useAuthStore.getState();
    expect(state.token).toBe("my-token");
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it("setUser updates only the user", () => {
    useAuthStore.getState().setCredentials("my-token", mockUser);

    const updatedUser = { ...mockUser, full_name: "Updated Name" };
    useAuthStore.getState().setUser(updatedUser);

    const state = useAuthStore.getState();
    expect(state.user?.full_name).toBe("Updated Name");
    expect(state.token).toBe("my-token");
    expect(state.isAuthenticated).toBe(true);
  });

  it("logout clears all state", () => {
    useAuthStore.getState().setCredentials("my-token", mockUser);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
