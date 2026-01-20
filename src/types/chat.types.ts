import { Message } from "./message.types";

/**
 * Chat type enum
 */
export type ChatType = "private" | "group";

/**
 * Group member info
 */
export interface GroupMember {
  id: string;
  user_id: string;
  full_name: string;
  avatar: string | null;
  role: "owner" | "admin" | "member";
  username: string;
  joined_at: string;
  is_online?: boolean;
}

/**
 * Chat list item response (for sidebar)
 */
export interface ChatListItem {
  id: string;
  type: ChatType;
  name: string;
  avatar: string | null;
  unread_count: number;
  is_pinned?: boolean;
  last_read_at: string | null;
  other_last_read_at: string | null;
  other_user_id?: string | null;
  is_blocked_by_me?: boolean;
  is_blocked_by_other?: boolean;
  last_message: Message | null;
  is_online?: boolean;
  hidden_at?: string | null;
  created_at?: string;
  description?: string | null;
  my_role?: "owner" | "admin" | "member";
  other_user_is_deleted?: boolean;
  other_user_is_banned?: boolean;
  member_count?: number;
}

/**
 * Chat creation response
 */
export interface ChatResponse {
  id: string;
  type: ChatType;
  created_at: string;
}

/**
 * Create private chat request
 */
export interface CreatePrivateChatRequest {
  target_user_id: string;
}

/**
 * Get chats query parameters
 */
export interface GetChatsParams {
  query?: string;
  cursor?: string;
  limit?: number;
}
