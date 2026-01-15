import api from "@/lib/axios";
import type {
  ApiResponse,
  ChatListItem,
  ChatResponse,
  CreatePrivateChatRequest,
  GetChatsParams,
  PaginatedResponse,
} from "@/types";

/**
 * Chat Service - handles chat-related API calls
 */
export const chatService = {
  /**
   * Get chat list with cursor-based pagination
   */
  async getChats(
    params: GetChatsParams = {},
    signal?: AbortSignal
  ): Promise<PaginatedResponse<ChatListItem>> {
    const response = await api.get<PaginatedResponse<ChatListItem>>("/api/chats", {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Create or retrieve existing private chat
   */
  async createPrivateChat(data: CreatePrivateChatRequest): Promise<ChatListItem> {
    const response = await api.post<ApiResponse<ChatListItem>>("/api/chats/private", data);
    return response.data.data;
  },

  /**
   * Hide a chat
   */
  async hideChat(chatId: string): Promise<void> {
    await api.post(`/api/chats/${chatId}/hide`);
  },

  /**
   * Mark chat as read
   */
  async markAsRead(chatId: string): Promise<void> {
    await api.post(`/api/chats/${chatId}/read`);
  },

  /**
   * Get chat details by ID
   */
  async getChatById(chatId: string, signal?: AbortSignal): Promise<ChatListItem> {
    const response = await api.get<ApiResponse<ChatListItem>>(`/api/chats/${chatId}`, { signal });
    return response.data.data;
  },

  /**
   * Create a new group chat
   */
  async createGroup(data: FormData): Promise<ChatResponse> {
    const response = await api.post<ApiResponse<ChatResponse>>("/api/chats/group", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  /**
   * Update group info
   */
  async updateGroup(groupId: string, data: FormData): Promise<ChatListItem> {
    const response = await api.put<ApiResponse<ChatListItem>>(`/api/chats/group/${groupId}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  /**
   * Leave group
   */
  async leaveGroup(groupId: string): Promise<void> {
    await api.post(`/api/chats/group/${groupId}/leave`);
  },

  /**
   * Add member to group
   */
  async addGroupMember(groupId: string, userIds: string[]): Promise<void> {
    await api.post(`/api/chats/group/${groupId}/members`, { user_ids: userIds });
  },

  /**
   * Kick member from group
   */
  async kickGroupMember(groupId: string, userId: string): Promise<void> {
    await api.post(`/api/chats/group/${groupId}/members/${userId}/kick`);
  },

  /**
   * Update member role
   */
  async updateMemberRole(groupId: string, userId: string, role: string): Promise<void> {
    await api.put(`/api/chats/group/${groupId}/members/${userId}/role`, { role });
  },

  /**
   * Transfer ownership
   */
  async transferOwnership(groupId: string, newOwnerId: string): Promise<void> {
    await api.post(`/api/chats/group/${groupId}/transfer`, { new_owner_id: newOwnerId });
  },
};

export default chatService;
