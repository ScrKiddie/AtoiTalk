import api from "@/lib/axios";
import type {
  ApiResponse,
  EditMessageRequest,
  GetMessagesParams,
  Message,
  PaginatedResponse,
  SendMessageRequest,
} from "@/types";

/**
 * Message Service - handles message-related API calls
 */
export const messageService = {
  /**
   * Get messages from a chat with cursor-based pagination
   */
  async getMessages(
    chatId: string,
    params: GetMessagesParams = {},
    signal?: AbortSignal
  ): Promise<PaginatedResponse<Message>> {
    const response = await api.get<PaginatedResponse<Message>>(`/api/chats/${chatId}/messages`, {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Send a message to a chat
   */
  async sendMessage(data: SendMessageRequest): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>("/api/messages", data);
    return response.data.data;
  },

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/api/messages/${messageId}`);
  },
  /**
   * Edit a message
   */
  async editMessage(messageId: string, data: EditMessageRequest): Promise<Message> {
    const response = await api.put<ApiResponse<Message>>(`/api/messages/${messageId}`, data);
    return response.data.data;
  },
};

export default messageService;
