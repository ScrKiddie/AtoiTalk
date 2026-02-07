import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { userService } from "@/services";
import { useAuthStore, useUIStore } from "@/store";
import { Message, User } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";

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
  const setLoadingProfile = useUIStore((state) => state.setLoadingProfile);
  const queryClient = useQueryClient();

  const isMe = currentUser?.id === userId;
  const cachedUser = userId && !isMe ? queryClient.getQueryData<User>(["user", userId]) : null;

  const handleProfileClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;

    setLoadingProfile(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ["user", userId],
        queryFn: () => userService.getUserById(userId),
        staleTime: 0,
      });
      openProfileModal(userId);
    } catch {
      toast.error("Failed to load user profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const user = isMe ? currentUser : cachedUser;

  const userNameFromProfile = user?.full_name;
  const fallbackName = name || "Unknown User";
  const isDeleted = !userId;
  const effectiveName = userNameFromProfile || (isDeleted ? "Deleted Account" : fallbackName);
  const displayName = truncateString(effectiveName, 15);

  if (!userId || isDeleted) {
    return (
      <span className={isDeleted ? "italic text-muted-foreground/80 align-bottom" : "align-bottom"}>
        {displayName}
      </span>
    );
  }

  if (isMe) {
    return <span>You</span>;
  }

  return (
    <span
      onClick={handleProfileClick}
      className="cursor-pointer hover:no-underline hover:opacity-80 transition-opacity align-bottom hover:font-medium"
    >
      {displayName}
    </span>
  );
};

export const SystemMessageBadge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex justify-center w-full", className)}>
      <div className="inline-flex items-center justify-center bg-background border text-foreground rounded-full px-3 py-1 text-xs font-normal">
        {children}
      </div>
    </div>
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
            <span className="font-medium">
              {truncateString(actionData.initial_name || "Group", 15)}
            </span>
            " created by <Actor />
          </span>
        );
      case "system_rename":
        return (
          <span>
            <Actor /> changed group name to "
            <span className="font-medium">{truncateString(actionData.new_name, 15)}</span>"
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

  return <SystemMessageBadge>{getSystemMessageNodes(message)}</SystemMessageBadge>;
};
