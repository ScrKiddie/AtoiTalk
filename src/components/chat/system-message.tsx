import { useAuthStore, useUIStore } from "@/store";
import { Message } from "@/types";

interface SystemMessageProps {
  message: Message;
}

const SystemMessageUserLink = ({ userId, name }: { userId?: string; name: string }) => {
  const { user: currentUser } = useAuthStore();
  const openProfileModal = useUIStore((state) => state.openProfileModal);
  const isMe = currentUser?.id === userId;

  if (!userId) {
    return <span>{name}</span>;
  }

  if (isMe) {
    return <span>You</span>;
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        openProfileModal(userId);
      }}
      className="cursor-pointer hover:opacity-80 transition-opacity text-foreground"
    >
      {name}
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
          <>
            Group "{actionData.initial_name || "Group"}" created by <Actor />
          </>
        );
      case "system_rename":
        return (
          <>
            <Actor /> changed group name to "{actionData.new_name}"
          </>
        );
      case "system_description":
        return (
          <>
            <Actor /> updated group description
          </>
        );
      case "system_avatar":
        return (
          <>
            <Actor /> updated group icon
          </>
        );
      case "system_add":
        return (
          <>
            <Actor /> added <Target />
          </>
        );
      case "system_leave":
        return (
          <>
            <Actor /> left the group
          </>
        );
      case "system_kick":
        return (
          <>
            <Actor /> removed <Target />
          </>
        );
      case "system_promote":
        return (
          <>
            <Actor /> promoted <Target /> to {actionData.new_role}
          </>
        );
      case "system_demote":
        return (
          <>
            <Actor /> demoted <Target /> to {actionData.new_role}
          </>
        );
      case "system_transfer":
        return (
          <>
            <Actor /> transferred ownership to <Target />
          </>
        );
      default:
        return msg.content || "System notification";
    }
  };

  return (
    <div className="flex justify-center">
      <span className="bg-background border text-foreground rounded-full px-3 py-1 text-xs font-normal">
        {getSystemMessageNodes(message)}
      </span>
    </div>
  );
};
