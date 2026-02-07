import { InfiniteUserList } from "@/components/infinite-user-list";
import { AddMembersDialog } from "@/components/modals/add-members-dialog";
import { EditGroupDialog } from "@/components/modals/edit-group-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { GlobalLightbox } from "@/components/ui/lightbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDeleteGroup,
  useKickGroupMember,
  useLeaveGroup,
  useResetInviteCode,
  useTransferOwnership,
  useUpdateMemberRole,
} from "@/hooks/mutations/use-group";
import { toast } from "@/lib/toast";

import { useChat } from "@/hooks/queries";
import { useInfiniteGroupMembers } from "@/hooks/queries/use-group-members";

import { useAuthStore, useChatStore, useUIStore } from "@/store";
import { ChatListItem, GroupMember, PaginatedResponse } from "@/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Crown,
  Flag,
  Globe,
  Info,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  SquarePen,
  Trash2,
  User,
  UserMinus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReportDialog } from "./report-dialog";

interface InviteLinkSectionProps {
  chatId: string;
  inviteCode: string | null | undefined;
  isPublic: boolean;
  isAdminOrOwner: boolean;
  inviteExpiresAt?: string | null;
}

const InviteLinkSection = ({
  chatId,
  inviteCode,
  isPublic,
  isAdminOrOwner,
  inviteExpiresAt,
}: InviteLinkSectionProps) => {
  const { mutate: resetInvite, isPending: isResetting } = useResetInviteCode();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const isExpired = inviteExpiresAt ? new Date(inviteExpiresAt) < new Date() : false;

  const inviteLink = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : "";

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copied to clipboard");
  };

  const handleReset = () => {
    resetInvite(chatId, {
      onSuccess: () => {
        setIsResetConfirmOpen(false);
      },
    });
  };

  if (!inviteCode) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Invite Link
        </div>
        {!isPublic && inviteExpiresAt && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground/80">
              Expires{" "}
              {new Date(inviteExpiresAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-stretch gap-2 min-w-0">
        <div
          className={`text-sm bg-muted/50 p-2.5 rounded-md border text-foreground flex-1 flex items-center min-w-0 ${isExpired ? "opacity-60" : ""}`}
        >
          <span className={`truncate ${isExpired ? "line-through" : ""}`}>
            {isExpired ? "Invite link has expired" : inviteLink}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-auto w-10 shrink-0 aspect-square"
          onClick={handleCopy}
          disabled={!inviteCode || isExpired}
          title="Copy Link"
        >
          <Copy className="h-4 w-4" />
        </Button>
        {isAdminOrOwner && (
          <Button
            variant="outline"
            size="icon"
            className="h-auto w-10 shrink-0 aspect-square text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            onClick={() => (isExpired ? handleReset() : setIsResetConfirmOpen(true))}
            disabled={isResetting}
            title="Reset Link"
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <ConfirmationDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Reset Invite Link?"
        description="The current invite link will no longer work. Users attempting to join with the old link will be rejected. Are you sure you want to generate a new one?"
        confirmText="Reset Link"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleReset}
        isLoading={isResetting}
      />
    </div>
  );
};

interface GroupProfileDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  chat: ChatListItem;
}

export function GroupProfileDialog({
  isOpen,
  onClose,
  chat: initialChat,
}: GroupProfileDialogProps) {
  const { data: chatData } = useChat(isOpen ? initialChat.id : null);
  const chat = chatData || initialChat;
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [memberSearch, setMemberSearch] = useState("");
  const [kickCandidate, setKickCandidate] = useState<GroupMember | null>(null);
  const [promoteCandidate, setPromoteCandidate] = useState<GroupMember | null>(null);
  const [demoteCandidate, setDemoteCandidate] = useState<GroupMember | null>(null);
  const [transferCandidate, setTransferCandidate] = useState<GroupMember | null>(null);
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const openProfileModal = useUIStore((state) => state.openProfileModal);
  const queryClient = useQueryClient();

  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const setActiveChatId = useChatStore((state) => state.setActiveChatId);

  const { mutate: leaveGroup, isPending: isLeaving } = useLeaveGroup();
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteGroup();
  const { mutate: kickMember, isPending: isKicking } = useKickGroupMember();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateMemberRole();
  const { mutate: transferOwnership, isPending: isTransferring } = useTransferOwnership();

  const {
    data: membersData,
    isLoading: isLoadingMembers,
    isError: isMembersError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch: refetchMembers,
  } = useInfiniteGroupMembers(
    chat.id,
    debouncedMemberSearch.length >= 3 ? debouncedMemberSearch : "",
    { enabled: isOpen && activeTab === "members" }
  );

  const isShortSearch = debouncedMemberSearch.length > 0 && debouncedMemberSearch.length < 3;
  const membersList = isShortSearch
    ? []
    : membersData?.pages.flatMap((page) => page.data).filter((m): m is GroupMember => m !== null) ||
      [];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  useEffect(() => {
    if (!isOpen) {
      setIsAvatarLoaded(false);
      const timer = setTimeout(() => {
        setActiveTab("overview");
        setMemberSearch("");
        setIsEditGroupOpen(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, chat]);

  const handleLeaveGroup = () => {
    setActiveChatId(null);
    leaveGroup(chat.id, {
      onSuccess: () => {
        onClose(false);
        setTimeout(() => {
          navigate("/");
        }, 300);
      },
    });
  };

  const handleDeleteGroup = () => {
    setActiveChatId(null);
    deleteGroup(chat.id, {
      onSuccess: () => {
        onClose(false);
        setTimeout(() => {
          navigate("/");
        }, 300);
      },
    });
  };

  const handlePromoteToAdmin = (member: GroupMember) => {
    setPromoteCandidate(member);
  };

  const confirmPromote = () => {
    if (!promoteCandidate) return;
    updateRole(
      { groupId: chat.id, userId: promoteCandidate.user_id, role: "admin" },
      {
        onSuccess: () => setPromoteCandidate(null),
      }
    );
  };

  const handleDemoteToMember = (member: GroupMember) => {
    setDemoteCandidate(member);
  };

  const confirmDemote = () => {
    if (!demoteCandidate) return;
    updateRole(
      { groupId: chat.id, userId: demoteCandidate.user_id, role: "member" },
      {
        onSuccess: () => setDemoteCandidate(null),
      }
    );
  };

  const handleTransferOwnership = (member: GroupMember) => {
    setTransferCandidate(member);
  };

  const confirmTransfer = () => {
    if (!transferCandidate) return;
    transferOwnership(
      { groupId: chat.id, newOwnerId: transferCandidate.user_id },
      {
        onSuccess: () => setTransferCandidate(null),
      }
    );
  };

  const handleViewMemberProfile = (member: GroupMember) => {
    openProfileModal(member.user_id);
  };

  const handleKickMember = () => {
    if (!kickCandidate) return;
    kickMember(
      { groupId: chat.id, userId: kickCandidate.user_id },
      {
        onSuccess: () => {
          queryClient.setQueryData<InfiniteData<PaginatedResponse<GroupMember>>>(
            [
              "group-members",
              "infinite",
              chat.id,
              debouncedMemberSearch.length >= 3 ? debouncedMemberSearch : "",
            ],
            (oldData) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                pages: oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((m) => m.id !== kickCandidate.id),
                })),
              };
            }
          );
          queryClient.removeQueries({ queryKey: ["users", "search"] });
          setKickCandidate(null);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => !isLeaving && onClose(val)}>
        <DialogContent
          size="default"
          className="max-h-[85vh] flex flex-col"
          onInteractOutside={(e) =>
            (isLightboxOpen ||
              isLeaveConfirmOpen ||
              kickCandidate ||
              isAddMemberOpen ||
              isEditGroupOpen) &&
            e.preventDefault()
          }
          onEscapeKeyDown={(e) =>
            (isLightboxOpen ||
              isLeaveConfirmOpen ||
              kickCandidate ||
              isAddMemberOpen ||
              isEditGroupOpen) &&
            e.preventDefault()
          }
        >
          <DialogHeader>
            <DialogTitle>Group Info</DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full flex-1 flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>

            <TabsContent
              value="overview"
              className="flex-1 flex flex-col min-h-0"
              forceMount={activeTab === "overview" ? true : undefined}
            >
              <ScrollArea className="flex-1 min-h-0">
                <div className="flex flex-col items-center gap-1 mb-4 w-full shrink-0 relative group/avatar pt-4">
                  <Avatar
                    className={`h-20 w-20 ${chat.avatar && isAvatarLoaded ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                    onClick={() => chat.avatar && isAvatarLoaded && setIsLightboxOpen(true)}
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
                        onClick={() => setIsEditGroupOpen(true)}
                      >
                        <SquarePen className="size-5" />
                        <span className="text-xs font-medium">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 flex flex-col gap-1 h-auto py-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                        onClick={() => setIsLeaveConfirmOpen(true)}
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
                        onClick={() => setIsReportOpen(true)}
                      >
                        <Flag className="size-5" />
                        <span className="text-xs font-medium">Report</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 flex flex-col gap-1 h-auto py-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                        onClick={() => setIsLeaveConfirmOpen(true)}
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
            <TabsContent
              value="members"
              className="h-[420px] flex flex-col flex-none"
              forceMount={activeTab === "members" ? true : undefined}
            >
              <div className="py-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      className="pl-8"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>
                  {(chat.my_role === "owner" || chat.my_role === "admin") && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setIsAddMemberOpen(true)}
                      title="Add Members"
                    >
                      <Plus className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 -mr-4 pr-3">
                <InfiniteUserList
                  users={membersList}
                  isLoading={isLoadingMembers}
                  isError={isMembersError}
                  hasNextPage={!!hasNextPage}
                  isFetchingNextPage={!!isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                  refetch={refetchMembers}
                  skeletonButtonCount={2}
                  renderActions={(member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors group gap-2"
                    >
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
                              onClick={() => handleViewMemberProfile(member)}
                              title="View Profile"
                            >
                              <Info className="size-4" />
                            </Button>

                            {chat.my_role === "owner" ? (
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="size-8"
                                    title="Member Settings"
                                  >
                                    <Settings className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 z-[65]">
                                  {member.role === "member" && (
                                    <DropdownMenuItem onClick={() => handlePromoteToAdmin(member)}>
                                      <Shield className="mr-2 h-4 w-4 text-blue-500" />
                                      <span>Promote to Admin</span>
                                    </DropdownMenuItem>
                                  )}
                                  {member.role === "admin" && (
                                    <DropdownMenuItem onClick={() => handleDemoteToMember(member)}>
                                      <User className="mr-2 h-4 w-4" />
                                      <span>Demote to Member</span>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleTransferOwnership(member)}>
                                    <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                                    <span>Transfer Ownership</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setKickCandidate(member)}
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
                                  onClick={() => setKickCandidate(member)}
                                  title="Remove Member"
                                >
                                  <UserMinus className="size-4" />
                                </Button>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  )}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <GlobalLightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        slides={chat.avatar ? [{ src: chat.avatar, alt: chat.name }] : []}
      />

      <ConfirmationDialog
        open={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        title={chat.my_role === "owner" ? "Delete Group?" : "Leave Group?"}
        description={
          chat.my_role === "owner"
            ? `Are you sure you want to delete "${chat.name}"? This action cannot be undone and all data will be lost.`
            : `Are you sure you want to leave "${chat.name}"? You won't be able to see message history or send messages.`
        }
        confirmText={chat.my_role === "owner" ? "Delete Group" : "Leave"}
        cancelText="Cancel"
        variant="destructive"
        onConfirm={chat.my_role === "owner" ? handleDeleteGroup : handleLeaveGroup}
        isLoading={chat.my_role === "owner" ? isDeleting : isLeaving}
      />

      <ConfirmationDialog
        open={!!kickCandidate}
        onOpenChange={(open) => !open && setKickCandidate(null)}
        title="Remove Member?"
        description={`Are you sure you want to remove ${kickCandidate?.full_name} from the group?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleKickMember}
        isLoading={isKicking}
      />

      <ConfirmationDialog
        open={!!promoteCandidate}
        onOpenChange={(open) => !open && setPromoteCandidate(null)}
        title="Promote to Admin?"
        description={`Are you sure you want to promote ${promoteCandidate?.full_name} to Admin? They will be able to manage members and edit group info.`}
        confirmText="Promote"
        cancelText="Cancel"
        onConfirm={confirmPromote}
        isLoading={isUpdatingRole}
        className="z-[66]"
        overlayClassName="z-[65]"
      />

      <ConfirmationDialog
        open={!!demoteCandidate}
        onOpenChange={(open) => !open && setDemoteCandidate(null)}
        title="Demote to Member?"
        description={`Are you sure you want to demote ${demoteCandidate?.full_name} back to Member? They will lose admin privileges.`}
        confirmText="Demote"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDemote}
        isLoading={isUpdatingRole}
        className="z-[66]"
        overlayClassName="z-[65]"
      />

      <ConfirmationDialog
        open={!!transferCandidate}
        onOpenChange={(open) => !open && setTransferCandidate(null)}
        title="Transfer Ownership?"
        description={`Are you sure you want to transfer ownership to ${transferCandidate?.full_name}? You will become an Admin and lose Owner privileges. This action cannot be undone.`}
        confirmText="Transfer Ownership"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmTransfer}
        isLoading={isTransferring}
      />

      <AddMembersDialog
        isOpen={isAddMemberOpen}
        onClose={setIsAddMemberOpen}
        groupId={chat.id}
        existingMemberIds={[]}
      />

      <EditGroupDialog isOpen={isEditGroupOpen} onClose={setIsEditGroupOpen} chat={chat} />
      <ReportDialog
        isOpen={isReportOpen}
        onClose={setIsReportOpen}
        targetType="group"
        targetId={chat.id}
        targetName={chat.name}
      />
    </>
  );
}
