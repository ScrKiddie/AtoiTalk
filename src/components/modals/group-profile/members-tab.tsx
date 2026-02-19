import { InfiniteUserList } from "@/components/infinite-user-list";
import { MemberItem } from "@/components/modals/group-profile/member-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { useInfiniteGroupMembers } from "@/hooks/queries/use-group-members";
import { ChatListItem, GroupMember, User } from "@/types";
import { Plus, Search } from "lucide-react";
import { useEffect } from "react";

interface MembersTabProps {
  activeTab: string;
  chat: ChatListItem;
  isOpen: boolean;
  memberSearch: string;
  setMemberSearch: (search: string) => void;
  debouncedMemberSearch: string;
  setDebouncedMemberSearch: (search: string) => void;
  currentUser: User | null;
  onAddMember: () => void;
  onViewProfile: (member: GroupMember) => void;
  onPromote: (member: GroupMember) => void;
  onDemote: (member: GroupMember) => void;
  onTransfer: (member: GroupMember) => void;
  onKick: (member: GroupMember) => void;
}

export const MembersTab = ({
  activeTab,
  chat,
  isOpen,
  memberSearch,
  setMemberSearch,
  debouncedMemberSearch,
  setDebouncedMemberSearch,
  currentUser,
  onAddMember,
  onViewProfile,
  onPromote,
  onDemote,
  onTransfer,
  onKick,
}: MembersTabProps) => {
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
  }, [memberSearch, setDebouncedMemberSearch]);

  return (
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
            <Button size="icon" variant="outline" onClick={onAddMember} title="Add Members">
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
            <MemberItem
              key={member.id}
              member={member}
              currentUser={currentUser}
              chat={chat}
              onViewProfile={onViewProfile}
              onPromote={onPromote}
              onDemote={onDemote}
              onTransfer={onTransfer}
              onKick={onKick}
            />
          )}
        />
      </div>
    </TabsContent>
  );
};
