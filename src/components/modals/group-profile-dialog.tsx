import { InfiniteUserList } from "@/components/infinite-user-list";
import { AddMembersDialog } from "@/components/modals/add-members-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteGroup,
  useKickGroupMember,
  useLeaveGroup,
  useTransferOwnership,
  useUpdateGroup,
  useUpdateMemberRole,
} from "@/hooks/mutations/use-group";
import { useChat } from "@/hooks/queries";
import { useInfiniteGroupMembers } from "@/hooks/queries/use-group-members";
import { getInitials } from "@/lib/avatar-utils";
import { useAuthStore, useUIStore } from "@/store";
import { ChatListItem, GroupMember, PaginatedResponse } from "@/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Crown,
  Info,
  Pencil,
  Plus,
  Search,
  Settings,
  Shield,
  User,
  UserMinus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

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
  const { data: latestChat } = useChat(isOpen ? initialChat.id : null);
  const chat = latestChat || initialChat;
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

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chat.name);
  const [editDescription, setEditDescription] = useState(chat.description || "");

  const openProfileModal = useUIStore((state) => state.openProfileModal);
  const queryClient = useQueryClient();

  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  const { mutate: leaveGroup, isPending: isLeaving } = useLeaveGroup();
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteGroup();
  const { mutate: updateGroup, isPending: isUpdating } = useUpdateGroup();
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
        setIsEditing(false);
        setEditName(chat.name);
        setEditDescription(chat.description || "");
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, chat]);

  const handleLeaveGroup = () => {
    leaveGroup(chat.id, {
      onSuccess: () => {
        onClose(false);
        navigate("/");
      },
    });
  };

  const handleDeleteGroup = () => {
    deleteGroup(chat.id, {
      onSuccess: () => {
        onClose(false);
        navigate("/");
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

  const handleSaveGroupInfo = () => {
    if (!editName.trim()) return;

    const formData = new FormData();
    formData.append("name", editName);
    formData.append("description", editDescription);

    updateGroup(
      { groupId: chat.id, data: formData },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
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

  const initials = getInitials(chat.name);

  return (
    <>
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] bg-black/50 animate-in fade-in-0"
            aria-hidden="true"
          />,
          document.body
        )}

      <Dialog open={isOpen} onOpenChange={(val) => !isLeaving && onClose(val)}>
        <DialogContent
          className="sm:max-w-[425px] h-[420px] flex flex-col z-[61]"
          onInteractOutside={(e) =>
            (isLightboxOpen || isLeaveConfirmOpen || kickCandidate || isAddMemberOpen) &&
            e.preventDefault()
          }
          onEscapeKeyDown={(e) =>
            (isLightboxOpen || isLeaveConfirmOpen || kickCandidate || isAddMemberOpen) &&
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

            <div className="flex-1 overflow-hidden mt-4 relative">
              <TabsContent
                value="overview"
                className="absolute inset-0 flex flex-col"
                forceMount={activeTab === "overview" ? true : undefined}
              >
                <div className="flex flex-col items-center gap-1 mb-4 w-full shrink-0 relative group/avatar">
                  <Avatar
                    className={`h-20 w-20 ${chat.avatar && isAvatarLoaded ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                    onClick={() =>
                      chat.avatar && isAvatarLoaded && !isEditing && setIsLightboxOpen(true)
                    }
                  >
                    <AvatarImage
                      src={chat.avatar || undefined}
                      className="object-cover"
                      onLoadingStatusChange={(status) => setIsAvatarLoaded(status === "loaded")}
                    />
                    <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
                  </Avatar>

                  {isEditing ? (
                    <div className="mt-2 w-full px-8">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-center font-semibold text-lg h-9"
                        placeholder="Group Name"
                        disabled={isUpdating}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mt-1 w-full relative">
                      <h3 className="font-semibold text-lg text-center break-all line-clamp-2 px-6">
                        {chat.name}
                      </h3>
                      {(chat.my_role === "owner" || chat.my_role === "admin") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                          onClick={() => setIsEditing(true)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {chat.member_count || 0} {(chat.member_count || 0) === 1 ? "member" : "members"}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-1 shrink-0">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </div>
                  </div>

                  {isEditing ? (
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="flex-1 min-h-[100px] resize-none text-sm bg-background"
                      placeholder="Add a description..."
                      disabled={isUpdating}
                    />
                  ) : (
                    <div className="flex-1 text-sm bg-muted/50 p-2.5 rounded-md border text-foreground whitespace-pre-wrap break-words overflow-y-auto custom-scrollbar">
                      {chat.description || (
                        <span className="text-muted-foreground/60 italic">No description</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 shrink-0 flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 h-9"
                        onClick={() => setIsEditing(false)}
                        disabled={isUpdating}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 h-9"
                        onClick={handleSaveGroupInfo}
                        disabled={isUpdating}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      className="w-full h-9"
                      onClick={() => setIsLeaveConfirmOpen(true)}
                    >
                      {chat.my_role === "owner" ? "Delete Group" : "Leave Group"}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="members"
                className="absolute inset-0 flex flex-col"
                forceMount={activeTab === "members" ? true : undefined}
              >
                <div className="pb-4 shrink-0">
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
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col text-left min-w-0 w-full">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">
                                {member.user_id === currentUser?.id ? "You" : member.full_name}
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

                        {member.user_id !== currentUser?.id && (
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
            </div>
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
        className="z-[66]"
        overlayClassName="z-[65]"
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
        className="z-[66]"
        overlayClassName="z-[65]"
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
        className="z-[66]"
        overlayClassName="z-[65]"
      />

      <AddMembersDialog
        isOpen={isAddMemberOpen}
        onClose={setIsAddMemberOpen}
        groupId={chat.id}
        existingMemberIds={[]}
      />
    </>
  );
}
