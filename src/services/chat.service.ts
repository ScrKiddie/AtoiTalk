import api from "@/lib/axios";
import type {
  ApiResponse,
  ChatListItem,
  ChatResponse,
  CreatePrivateChatRequest,
  GetChatsParams,
  GroupMember,
  Message,
  PaginatedResponse,
  PublicGroupDTO,
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
  async leaveGroup(groupId: string): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(`/api/chats/group/${groupId}/leave`);
    return response.data?.data;
  },

  /**
   * Add member to group
   */
  async addGroupMember(groupId: string, userIds: string[]): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(`/api/chats/group/${groupId}/members`, {
      user_ids: userIds,
    });
    return response.data.data;
  },

  /**
   * Kick member from group
   */
  async kickGroupMember(groupId: string, userId: string): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(
      `/api/chats/group/${groupId}/members/${userId}/kick`
    );
    return response.data?.data;
  },

  /**
   * Delete group
   */
  async deleteGroup(groupId: string): Promise<void> {
    await api.delete(`/api/chats/group/${groupId}`);
  },

  /**
   * Update member role
   */
  async updateMemberRole(groupId: string, userId: string, role: string): Promise<Message> {
    const response = await api.put<ApiResponse<Message>>(
      `/api/chats/group/${groupId}/members/${userId}/role`,
      {
        role,
      }
    );
    return response.data?.data;
  },

  /**
   * Transfer ownership
   */
  async transferOwnership(groupId: string, newOwnerId: string): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(`/api/chats/group/${groupId}/transfer`, {
      new_owner_id: newOwnerId,
    });
    return response.data?.data;
  },

  /**
   * Get group members with pagination
   */
  async getGroupMembers(
    groupId: string,
    params: { query?: string; cursor?: string; limit?: number } = {},
    signal?: AbortSignal
  ): Promise<PaginatedResponse<GroupMember>> {
    const response = await api.get<PaginatedResponse<GroupMember>>(
      `/api/chats/group/${groupId}/members`,
      { params, signal }
    );
    return response.data;
  },

  async resetGroupInviteCode(groupId: string): Promise<{ code: string; expires_at: string }> {
    const response = await api.put<
      ApiResponse<{ invite_code?: string; code?: string; expires_at: string }>
    >(`/api/chats/group/${groupId}/invite`);
    const data = response.data.data;
    return {
      code: data.invite_code || data.code || "",
      expires_at: data.expires_at,
    };
  },

  async getGroupPreview(inviteCode: string, signal?: AbortSignal): Promise<ChatListItem> {
    const response = await api.get<ApiResponse<ChatListItem>>(
      `/api/chats/group/invite/${inviteCode}`,
      { signal }
    );
    return response.data.data;
  },

  async joinGroupByInvite(inviteCode: string): Promise<ChatListItem> {
    const response = await api.post<ApiResponse<ChatListItem>>("/api/chats/group/join/invite", {
      invite_code: inviteCode,
    });
    return response.data.data;
  },

  async searchPublicGroups(
    params: { query?: string; cursor?: string; limit?: number } = {},
    signal?: AbortSignal
  ): Promise<PaginatedResponse<PublicGroupDTO>> {
    const response = await api.get<PaginatedResponse<PublicGroupDTO>>("/api/chats/group/public", {
      params,
      signal,
    });
    return response.data;
  },

  async joinGroup(groupId: string): Promise<ChatListItem | null> {
    const response = await api.post<ApiResponse<ChatListItem>>(`/api/chats/group/${groupId}/join`);

    if (response.data && "data" in response.data) {
      return response.data.data;
    }

    if (response.data) {
      return response.data as unknown as ChatListItem;
    }

    return null;
  },
};

export default chatService;
