import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatListItem, GroupMember, User } from "@/types";
import { Crown, Info, Settings, Shield, User as UserIcon, UserMinus } from "lucide-react";

interface MemberItemProps {
  member: GroupMember;
  currentUser: User | null;
  chat: ChatListItem;
  onViewProfile: (member: GroupMember) => void;
  onPromote: (member: GroupMember) => void;
  onDemote: (member: GroupMember) => void;
  onTransfer: (member: GroupMember) => void;
  onKick: (member: GroupMember) => void;
}

export const MemberItem = ({
  member,
  currentUser,
  chat,
  onViewProfile,
  onPromote,
  onDemote,
  onTransfer,
  onKick,
}: MemberItemProps) => {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors group gap-2">
      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
        <Avatar>
          <AvatarImage
            src={
              !member.full_name || member.full_name === "Deleted Account"
                ? undefined
                : member.avatar || undefined
            }
          />
          <AvatarFallback>
            {!member.full_name || member.full_name === "Deleted Account"
              ? "?"
              : member.full_name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col text-left min-w-0 w-full">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">
              {member.user_id === currentUser?.id
                ? "You"
                : !member.full_name || member.full_name === "Deleted Account"
                  ? "Deleted Account"
                  : member.full_name}
            </span>
            {member.role === "owner" && (
              <Shield className="size-3 text-yellow-500 fill-yellow-500 shrink-0" />
            )}
            {member.role === "admin" && (
              <Shield className="size-3 text-blue-500 fill-blue-500 shrink-0" />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate">
            @{member.username}
            {member.role !== "member" && ` • ${member.role}`}
          </span>
        </div>
      </div>

      {member.user_id !== currentUser?.id &&
        member.full_name &&
        member.full_name !== "Deleted Account" && (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => onViewProfile(member)}
              title="View Profile"
            >
              <Info className="size-4" />
            </Button>

            {chat.my_role === "owner" ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="size-8" title="Member Settings">
                    <Settings className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[65]">
                  {member.role === "member" && (
                    <DropdownMenuItem onClick={() => onPromote(member)}>
                      <Shield className="mr-2 h-4 w-4 text-blue-500" />
                      <span>Promote to Admin</span>
                    </DropdownMenuItem>
                  )}
                  {member.role === "admin" && (
                    <DropdownMenuItem onClick={() => onDemote(member)}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Demote to Member</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onTransfer(member)}>
                    <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                    <span>Transfer Ownership</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onKick(member)}
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    <span>Remove Member</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              chat.my_role === "admin" &&
              member.role === "member" && (
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => onKick(member)}
                  title="Remove Member"
                >
                  <UserMinus className="size-4" />
                </Button>
              )
            )}
          </div>
        )}
    </div>
  );
};
