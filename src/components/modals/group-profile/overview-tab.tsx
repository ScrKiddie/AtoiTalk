import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TabsContent } from "@/components/ui/tabs";
import { ChatListItem } from "@/types";
import { Flag, Globe, Lock, LogOut, SquarePen, Trash2, Users } from "lucide-react";
import { InviteLinkSection } from "./invite-link-section";

interface OverviewTabProps {
  activeTab: string;
  chat: ChatListItem;
  isAvatarLoaded: boolean;
  setIsAvatarLoaded: (loaded: boolean) => void;
  onAvatarClick: () => void;
  onEditGroup: () => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  onReportGroup: () => void;
}

export const OverviewTab = ({
  activeTab,
  chat,
  isAvatarLoaded,
  setIsAvatarLoaded,
  onAvatarClick,
  onEditGroup,
  onLeaveGroup,
  onDeleteGroup,
  onReportGroup,
}: OverviewTabProps) => {
  return (
    <TabsContent
      value="overview"
      className="flex-1 flex flex-col min-h-0"
      forceMount={activeTab === "overview" ? true : undefined}
    >
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col items-center gap-1 mb-4 w-full shrink-0 relative group/avatar pt-4">
          <Avatar
            className={`h-20 w-20 ${chat.avatar && isAvatarLoaded ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
            onClick={onAvatarClick}
          >
            <AvatarImage
              src={chat.avatar || undefined}
              className="object-cover"
              onLoadingStatusChange={(status) => setIsAvatarLoaded(status === "loaded")}
            />
            <AvatarFallback>
              <Users className="size-10 text-white" />
            </AvatarFallback>
          </Avatar>

          <div className="flex justify-center mt-1 w-full px-6">
            <div className="flex items-center gap-1 max-w-full">
              <h3 className="font-semibold text-lg truncate">{chat.name}</h3>
              {chat.type === "group" && (
                <div
                  title={chat.is_public ? "Public Group" : "Private Group"}
                  className="shrink-0 flex items-center"
                >
                  {chat.is_public ? (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {chat.member_count || 0} {(chat.member_count || 0) === 1 ? "member" : "members"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full px-4 mb-4">
          {chat.my_role === "owner" || chat.my_role === "admin" ? (
            <>
              <Button
                variant="outline"
                className="flex-1 flex flex-col gap-1 h-auto py-3"
                onClick={onEditGroup}
              >
                <SquarePen className="size-5" />
                <span className="text-xs font-medium">Edit</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex flex-col gap-1 h-auto py-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                onClick={chat.my_role === "owner" ? onDeleteGroup : onLeaveGroup}
              >
                {chat.my_role === "owner" ? (
                  <>
                    <Trash2 className="size-5" />
                    <span className="text-xs font-medium">Delete</span>
                  </>
                ) : (
                  <>
                    <LogOut className="size-5" />
                    <span className="text-xs font-medium">Leave</span>
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1 flex flex-col gap-1 h-auto py-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                onClick={onReportGroup}
              >
                <Flag className="size-5" />
                <span className="text-xs font-medium">Report</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex flex-col gap-1 h-auto py-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                onClick={onLeaveGroup}
              >
                <LogOut className="size-5" />
                <span className="text-xs font-medium">Leave</span>
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-col min-h-0 mb-4 px-4">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </div>
          </div>

          <div className="min-h-[120px] text-sm bg-muted/50 p-2.5 rounded-md border text-foreground whitespace-pre-wrap break-words">
            {chat.description || (
              <span className="text-muted-foreground/60 italic">No description</span>
            )}
          </div>
        </div>

        {(chat.is_public || chat.my_role === "owner" || chat.my_role === "admin") &&
          chat.invite_code && (
            <div className="px-4">
              <InviteLinkSection
                chatId={chat.id}
                inviteCode={chat.invite_code}
                isPublic={!!chat.is_public}
                isAdminOrOwner={chat.my_role === "owner" || chat.my_role === "admin"}
                inviteExpiresAt={chat.invite_expires_at}
              />
            </div>
          )}
      </ScrollArea>
    </TabsContent>
  );
};
