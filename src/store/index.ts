import type { User } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  setCredentials: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setCredentials: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

interface ChatState {
  activeChatId: string | null;

  typingUsers: Record<string, string[]>;
  onlineUsers: Set<string>;

  setActiveChatId: (chatId: string | null) => void;

  setUserTyping: (chatId: string, userId: string, isTyping: boolean) => void;

  setUserOnline: (userId: string, isOnline: boolean) => void;
  clearUserTypingGlobal: (userId: string) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  activeChatId: null,
  typingUsers: {},
  onlineUsers: new Set(),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  setActiveChatId: (chatId) => {
    set({ activeChatId: chatId });
  },

  setUserTyping: (chatId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[chatId] || [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);

      const newState = { ...state.typingUsers };
      if (updated.length === 0) {
        delete newState[chatId];
      } else {
        newState[chatId] = updated;
      }

      return {
        typingUsers: newState,
      };
    }),

  clearUserTypingGlobal: (userId) =>
    set((state) => {
      const newTypingUsers: Record<string, string[]> = { ...state.typingUsers };
      let hasChanges = false;

      Object.keys(newTypingUsers).forEach((chatId) => {
        if (newTypingUsers[chatId].includes(userId)) {
          newTypingUsers[chatId] = newTypingUsers[chatId].filter((id) => id !== userId);
          if (newTypingUsers[chatId].length === 0) {
            delete newTypingUsers[chatId];
          }
          hasChanges = true;
        }
      });

      return hasChanges ? { typingUsers: newTypingUsers } : state;
    }),

  setUserOnline: (userId, isOnline) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      if (isOnline) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return { onlineUsers: newSet };
    }),
}));

interface UIState {
  globalLoading: boolean;
  loadingMessage: string | null;
  sidebarOpen: boolean;

  setGlobalLoading: (loading: boolean, message?: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  globalLoading: false,
  loadingMessage: null,
  sidebarOpen: true,

  setGlobalLoading: (loading, message) =>
    set({ globalLoading: loading, loadingMessage: message || null }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
