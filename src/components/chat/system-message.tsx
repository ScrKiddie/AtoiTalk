import { useAuthStore, useUIStore } from "@/store";
import { Message } from "@/types";
import {
  AlignLeft,
  Crown,
  DoorOpen,
  Image as ImageIcon,
  Pencil,
  Plus,
  Settings,
  Shield,
  User,
  UserMinus,
  UserPlus,
} from "lucide-react";

interface SystemMessageProps {
  message: Message;
}

const SystemMessageUserLink = ({ userId, name }: { userId?: string; name: string }) => {
  const { user: currentUser } = useAuthStore();
  const openProfileModal = useUIStore((state) => state.openProfileModal);
  const isMe = currentUser?.id === userId;

  if (!userId) {
    return (
      <span className="max-w-[100px] truncate inline-block align-bottom font-medium">{name}</span>
    );
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
      className="cursor-pointer hover:no-underline hover:opacity-80 transition-opacity font-medium max-w-[100px] truncate inline-block align-bottom"
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
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>
              Group "
              <span className="max-w-[150px] truncate inline-block align-bottom font-medium">
                {actionData.initial_name || "Group"}
              </span>
              " created by <Actor />
            </span>
          </>
        );
      case "system_rename":
        return (
          <>
            <Pencil className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> changed group name to "
              <span className="max-w-[150px] truncate inline-block align-bottom font-medium">
                {actionData.new_name}
              </span>
              "
            </span>
          </>
        );
      case "system_description":
        return (
          <>
            <AlignLeft className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> updated group description
            </span>
          </>
        );
      case "system_avatar":
        const isRemoved = actionData.action === "removed" || actionData.delete_avatar === "true";
        return (
          <>
            <ImageIcon className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> {isRemoved ? "removed group icon" : "updated group icon"}
            </span>
          </>
        );
      case "system_add":
        return (
          <>
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> added <Target />
            </span>
          </>
        );
      case "system_leave":
        return (
          <>
            <DoorOpen className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> left the group
            </span>
          </>
        );
      case "system_kick":
        return (
          <>
            <UserMinus className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> removed <Target />
            </span>
          </>
        );
      case "system_promote":
        return (
          <>
            <Shield className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> promoted <Target /> to {actionData.new_role}
            </span>
          </>
        );
      case "system_demote":
        return (
          <>
            <User className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> demoted <Target /> to {actionData.new_role}
            </span>
          </>
        );
      case "system_transfer":
        return (
          <>
            <Crown className="w-3.5 h-3.5 mr-1" />
            <span>
              <Actor /> transferred ownership to <Target />
            </span>
          </>
        );
      default:
        return (
          <>
            <Settings className="w-3.5 h-3.5 mr-1" />
            <span>{msg.content || "System notification"}</span>
          </>
        );
    }
  };

  return (
    <div className="flex justify-center">
      <div className="bg-background border text-foreground rounded-full px-3 py-1 text-xs font-normal flex items-center justify-center">
        {getSystemMessageNodes(message)}
      </div>
    </div>
  );
};
