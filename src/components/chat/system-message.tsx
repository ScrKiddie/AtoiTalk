import { useAuthStore, useUIStore } from "@/store";
import { Message } from "@/types";

interface SystemMessageProps {
  message: Message;
}

const truncateString = (str: string, num: number) => {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + "...";
};

const SystemMessageUserLink = ({ userId, name }: { userId?: string; name: string }) => {
  const { user: currentUser } = useAuthStore();
  const openProfileModal = useUIStore((state) => state.openProfileModal);
  const isMe = currentUser?.id === userId;
  const displayName = truncateString(name, 30);

  if (!userId) {
    return <span className="font-medium align-bottom">{displayName}</span>;
  }

  if (isMe) {
    return <span className="font-medium">You</span>;
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        openProfileModal(userId);
      }}
      className="cursor-pointer hover:no-underline hover:opacity-80 transition-opacity font-medium align-bottom"
    >
      {displayName}
    </span>
  );
};

export const SystemMessage = ({ message }: SystemMessageProps) => {
  const getSystemMessageNodes = (msg: Message) => {
    const actionData = (msg.action_data || {}) as Record<string, string>;
    const actorName = actionData.actor_name || msg.sender_name || "User";
    const targetName = actionData.target_name || "User";
    const actorId = actionData.actor_id || msg.sender_id;
    const targetId = actionData.target_id;

    const Actor = () => <SystemMessageUserLink userId={actorId} name={actorName} />;
    const Target = () => <SystemMessageUserLink userId={targetId} name={targetName} />;

    switch (msg.type) {
      case "system_create":
        return (
          <span>
            Group "
            <span className="font-medium align-bottom">
              {truncateString(actionData.initial_name || "Group", 30)}
            </span>
            " created by <Actor />
          </span>
        );
      case "system_rename":
        return (
          <span>
            <Actor /> changed group name to "
            <span className="font-medium align-bottom">
              {truncateString(actionData.new_name, 30)}
            </span>
            "
          </span>
        );
      case "system_description":
        return (
          <span>
            <Actor /> updated group description
          </span>
        );
      case "system_avatar": {
        const isRemoved = actionData.action === "removed" || actionData.delete_avatar === "true";
        return (
          <span>
            <Actor /> {isRemoved ? "removed group icon" : "updated group icon"}
          </span>
        );
      }
      case "system_add":
        return (
          <span>
            <Actor /> added <Target />
          </span>
        );
      case "system_leave":
        return (
          <span>
            <Actor /> left the group
          </span>
        );
      case "system_kick":
        return (
          <span>
            <Actor /> removed <Target />
          </span>
        );
      case "system_promote":
        if (actionData.new_role === "owner" || actionData.action === "ownership_transferred") {
          return (
            <span>
              <Actor /> transferred ownership to <Target />
            </span>
          );
        }
        return (
          <span>
            <Actor /> promoted <Target /> to {actionData.new_role}
          </span>
        );
      case "system_demote":
        return (
          <span>
            <Actor /> demoted <Target /> to {actionData.new_role}
          </span>
        );
      case "system_transfer":
        return (
          <span>
            <Actor /> transferred ownership to <Target />
          </span>
        );
      case "system_join":
        return (
          <span>
            <Actor /> joined the group
          </span>
        );
      case "system_visibility":
        return (
          <span>
            <Actor /> made the group {actionData.new_visibility}
          </span>
        );
      default:
        return <span>{msg.content || "System notification"}</span>;
    }
  };

  return (
    <div className="flex justify-center text-center">
      <div className="bg-background border text-foreground rounded-full px-3 py-1.5 text-xs font-normal inline-block text-center w-fit max-w-[85%] break-words">
        {getSystemMessageNodes(message)}
      </div>
    </div>
  );
};
