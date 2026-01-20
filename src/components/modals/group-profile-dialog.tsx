import { InfiniteUserList } from "@/components/infinite-user-list";
import { AddMembersDialog } from "@/components/modals/add-members-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GlobalLightbox } from "@/components/ui/lightbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKickGroupMember, useLeaveGroup } from "@/hooks/mutations/use-group";
import { useGroupMembers, useInfiniteGroupMembers } from "@/hooks/queries/use-group-members";
import { getInitials } from "@/lib/avatar-utils";
import { useAuthStore, useUIStore } from "@/store";
import { ChatListItem, GroupMember } from "@/types";
import { Info, Plus, Search, Shield, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

interface GroupProfileDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  chat: ChatListItem;
}

export function GroupProfileDialog({ isOpen, onClose, chat }: GroupProfileDialogProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [memberSearch, setMemberSearch] = useState("");
  const [kickCandidate, setKickCandidate] = useState<GroupMember | null>(null);
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");

  const openProfileModal = useUIStore((state) => state.openProfileModal);

  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  const { mutate: leaveGroup, isPending: isLeaving } = useLeaveGroup();
  const { mutate: kickMember, isPending: isKicking } = useKickGroupMember();
  const { data: members } = useGroupMembers(chat.id, isOpen);

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
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleLeaveGroup = () => {
    leaveGroup(chat.id, {
      onSuccess: () => {
        onClose(false);
        navigate("/");
      },
    });
  };

  const handleViewMemberProfile = (member: GroupMember) => {
    openProfileModal(member.user_id);
  };

  const handleKickMember = () => {
    if (!kickCandidate) return;
    kickMember(
      { groupId: chat.id, userId: kickCandidate.user_id },
      {
        onSuccess: () => setKickCandidate(null),
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
                <div className="flex flex-col items-center gap-1 mb-4 w-full shrink-0">
                  <Avatar
                    className={`h-20 w-20 ${chat.avatar && isAvatarLoaded ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                    onClick={() => chat.avatar && isAvatarLoaded && setIsLightboxOpen(true)}
                  >
                    <AvatarImage
                      src={chat.avatar || undefined}
                      className="object-cover"
                      onLoadingStatusChange={(status) => setIsAvatarLoaded(status === "loaded")}
                    />
                    <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
                  </Avatar>

                  <h3 className="font-semibold text-lg text-center mt-1 break-all line-clamp-2">
                    {chat.name}
                  </h3>

                  <div className="text-xs text-muted-foreground">
                    {chat.member_count || 0} {(chat.member_count || 0) === 1 ? "member" : "members"}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 shrink-0">
                    Description
                  </div>
                  <div className="flex-1 text-sm bg-muted/50 p-2.5 rounded-md border text-foreground whitespace-pre-wrap break-words overflow-y-auto custom-scrollbar">
                    {chat.description || (
                      <span className="text-muted-foreground/60 italic">No description</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 shrink-0">
                  <Button
                    variant="destructive"
                    className="w-full h-9"
                    onClick={() => setIsLeaveConfirmOpen(true)}
                  >
                    Leave Group
                  </Button>
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
                                <Shield className="size-3 text-blue-500 shrink-0" />
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

                            {((chat.my_role === "owner" && member.role !== "owner") ||
                              (chat.my_role === "admin" && member.role === "member")) && (
                              <Button
                                size="icon"
                                variant="destructive"
                                className="size-8"
                                onClick={() => setKickCandidate(member)}
                                title="Remove Member"
                              >
                                <UserMinus className="size-4" />
                              </Button>
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
        title="Leave Group?"
        description={`Are you sure you want to leave "${chat.name}"? You won't be able to see message history or send messages.`}
        confirmText="Leave"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleLeaveGroup}
        isLoading={isLeaving}
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

      <AddMembersDialog
        isOpen={isAddMemberOpen}
        onClose={setIsAddMemberOpen}
        groupId={chat.id}
        existingMemberIds={members?.map((m) => m.user_id) || []}
      />
    </>
  );
}
