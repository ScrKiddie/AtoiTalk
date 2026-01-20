import { ChatListItem, GroupMember } from "./chat.types";
import { Message } from "./message.types";
import { UserUpdateEventPayload } from "./user.types";

export type EventType =
  | "message.new"
  | "message.update"
  | "message.delete"
  | "chat.new"
  | "chat.read"
  | "chat.hide"
  | "chat.delete"
  | "chat.typing"
  | "user.online"
  | "user.offline"
  | "user.update"
  | "user.block"
  | "user.unblock"
  | "user.banned"
  | "user.deleted"
  | "group.member_add"
  | "group.member_remove"
  | "group.role_update";

export interface EventMeta {
  timestamp: number;
  chat_id?: string;
  sender_id?: string;
  unread_count?: number;
}

export interface BaseEvent<T = unknown> {
  type: EventType;
  payload: T;
  meta: EventMeta;
}

export type ServerMessageNew = BaseEvent<Message>;

export type ServerMessageUpdate = BaseEvent<Message>;

export type ServerMessageDelete = BaseEvent<{
  message_id: string;
}>;

export type ServerChatNew = BaseEvent<ChatListItem>;

export type ServerChatRead = BaseEvent<{
  chat_id: string;
  user_id: string;
}>;

export type ServerChatHide = BaseEvent<{
  chat_id: string;
}>;

export type ServerChatDelete = BaseEvent<{
  chat_id: string;
}>;

export type ServerUserOnline = BaseEvent<{
  user_id: string;
  is_online: true;
  last_seen_at: number;
}>;

export type ServerUserOffline = BaseEvent<{
  user_id: string;
  is_online: false;
  last_seen_at: number;
}>;

export type ServerUserUpdate = BaseEvent<UserUpdateEventPayload>;

export type ServerUserBlock = BaseEvent<{
  blocker_id: string;
  blocked_id: string;
}>;

export type ServerUserUnblock = BaseEvent<{
  blocker_id: string;
  blocked_id: string;
}>;

export type ServerUserBanned = BaseEvent<{
  user_id: string;
  reason: string;
}>;

export type ServerUserDeleted = BaseEvent<{
  user_id: string;
}>;

export type ClientTyping = BaseEvent<{
  type: "chat.typing";
  meta: {
    chat_id: string;
  };
}>;

export type ServerTyping = BaseEvent<Record<string, never>>;

export type ServerGroupMemberAdd = BaseEvent<{
  group_id: string;
  member: GroupMember;
  member_count: number;
}>;

export type ServerGroupMemberRemove = BaseEvent<{
  group_id: string;
  user_id: string;
  member_count: number;
}>;

export type ServerGroupRoleUpdate = BaseEvent<{
  group_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
}>;
