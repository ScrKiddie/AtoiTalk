/**
 * Message type enum
 */
export type MessageType =
  | "text"
  | "image"
  | "video"
  | "file"
  | "audio"
  | "system_create"
  | "system_rename"
  | "system_description"
  | "system_avatar"
  | "system_add"
  | "system_leave"
  | "system_promote"
  | "system_demote"
  | "system_kick"
  | "system_transfer";

/**
 * Media/Attachment data transfer object
 */
export interface Media {
  id: string;
  url: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
}

/**
 * Reply preview for message replies
 */
export interface ReplyPreview {
  id: string;
  sender_id: string;
  content: string | null;
  sender_name: string;
  type: string;
  action_data?: Record<string, unknown>;
  deleted_at?: string | null;
  created_at?: string;
  attachments?: Media[] | null;
  is_jumpable?: boolean;
}

/**
 * Message response from API
 */
export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  sender_username?: string;
  sender_avatar?: string;

  content: string | null;
  type: string;
  action_data?: Record<string, unknown> | null;

  created_at: string;
  attachments: Media[] | null;
  reply_to: ReplyPreview | null;
  deleted_at?: string | null;
  edited_at?: string | null;
}

/**
 * Send message request payload
 */
export interface SendMessageRequest {
  chat_id: string;
  type: string;
  content?: string;
  attachment_ids?: string[];
  reply_to_id?: string;
}

/**
 * Edit message request payload
 */
export interface EditMessageRequest {
  content?: string;
  attachment_ids?: string[];
}

/**
 * Get messages query parameters
 */
export interface GetMessagesParams {
  cursor?: string;
  limit?: number;
  direction?: "older" | "newer";
  around_message_id?: string;
}

/**
 * Message with potentially deleted attachments for editing
 */
export interface EditMessage extends Omit<Message, "attachments"> {
  attachments: (Media & { delete?: boolean })[] | null;
}
