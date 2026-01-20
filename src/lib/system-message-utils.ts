import { Message } from "@/types";

export function getSystemMessageText(message: Message, currentUserId?: string): string {
  const actionData = (message.action_data || {}) as Record<string, string>;
  const actorName =
    message.sender_id === currentUserId
      ? "You"
      : actionData.actor_name || message.sender_name || "User";
  const targetName =
    actionData.target_id === currentUserId ? "You" : actionData.target_name || "User";
  const actorSubject = message.sender_id === currentUserId ? "You" : actorName;

  switch (message.type) {
    case "system_create":
      return `${actorSubject} created group "${actionData.initial_name || "Group"}"`;
    case "system_rename":
      return `${actorSubject} changed group name to "${actionData.new_name}"`;
    case "system_description":
      return `${actorSubject} updated group description`;
    case "system_avatar":
      return `${actorSubject} updated group icon`;
    case "system_add":
      return `${actorSubject} added ${targetName}`;
    case "system_leave":
      return `${actorSubject} left the group`;
    case "system_kick":
      return `${actorSubject} removed ${targetName}`;
    case "system_promote":
      return `${actorSubject} promoted ${targetName} to ${actionData.new_role}`;
    case "system_demote":
      return `${actorSubject} demoted ${targetName} to ${actionData.new_role}`;
    case "system_transfer":
      return `${actorSubject} transferred ownership to ${targetName}`;
    default:
      return message.content || "System notification";
  }
}
