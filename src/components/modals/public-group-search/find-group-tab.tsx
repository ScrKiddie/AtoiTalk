import { InfiniteList } from "@/components/infinite-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { useJoinGroup } from "@/hooks/mutations/use-group-join";
import { useSearchPublicGroups } from "@/hooks/queries/use-chat";
import { PublicGroupDTO } from "@/types";
import { Globe, Loader2, LogIn, Search, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface FindGroupTabProps {
  activeTab: string;
  search: string;
  setSearch: (search: string) => void;
  debouncedSearch: string;
  setDebouncedSearch: (search: string) => void;
  onClose: (open: boolean) => void;
}

export const FindGroupTab = ({
  activeTab,
  search,
  setSearch,
  debouncedSearch,
  setDebouncedSearch,
  onClose,
}: FindGroupTabProps) => {
  const navigate = useNavigate();
  const { mutate: joinGroup, isPending: isJoining } = useJoinGroup();
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

  const trimmedSearch = debouncedSearch.trim();
  const {
    data: searchResults,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    refetch,
  } = useSearchPublicGroups(trimmedSearch, {
    enabled: activeTab === "find",
    sortBy: trimmedSearch ? undefined : "member_count",
  });

  const groups = (searchResults?.pages.flatMap((page) => page.data) || []).filter((g) => !!g);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, setDebouncedSearch]);

  const handleJoin = (group: PublicGroupDTO) => {
    if (group.is_member) {
      onClose(false);
      setTimeout(() => {
        navigate(`/chat/${group.chat_id}`);
      }, 300);
      return;
    }

    setJoiningGroupId(group.id);
    joinGroup(group.chat_id, {
      onSuccess: () => {
        onClose(false);
        setTimeout(() => {
          navigate(`/chat/${group.chat_id}`);
        }, 300);
      },
      onError: () => {
        setJoiningGroupId(null);
      },
    });
  };

  return (
    <TabsContent
      value="find"
      className="absolute inset-0 data-[state=inactive]:hidden flex flex-col min-h-0"
      forceMount={activeTab === "find" ? true : undefined}
    >
      <div className="space-y-[1.5px] min-h-0 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search public groups..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus={activeTab === "find"}
            maxLength={100}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 -mx-6 px-6 mt-4">
        <InfiniteList<PublicGroupDTO>
          items={groups}
          isLoading={isSearching}
          isError={!!isError}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={!!isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          refetch={refetch}
          emptyMessage={debouncedSearch ? "No groups found." : "No groups available."}
          loadingHeight="h-10"
          showBorder={false}
          skeletonButtonCount={1}
          skeletonCount={5}
          resetKey={debouncedSearch}
          renderItem={(group) => {
            const isCurrentJoining = joiningGroupId === group.id;

            return (
              <div
                key={group.id}
                className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors group gap-2 min-w-0 overflow-hidden"
              >
                <div className="flex items-center gap-3 flex-1 w-0 overflow-hidden">
                  <Avatar>
                    <AvatarImage src={group.avatar || undefined} />
                    <AvatarFallback>
                      <Globe className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left min-w-0 overflow-hidden">
                    <span className="text-sm font-medium truncate">{group.name}</span>
                    <div className="flex items-center text-xs text-muted-foreground truncate gap-1.5 mt-0.5">
                      <span className="shrink-0 text-foreground/70">
                        {group.member_count || 0} members
                      </span>
                      {group.description && (
                        <>
                          <span className="shrink-0 opacity-50">•</span>
                          <span className="truncate">{group.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 transition-all duration-200"
                    onClick={() => handleJoin(group)}
                    disabled={isCurrentJoining || (isJoining && !!joiningGroupId)}
                  >
                    {isCurrentJoining ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : group.is_member ? (
                      <UserCheck className="size-4" />
                    ) : (
                      <LogIn className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          }}
        />
      </div>
    </TabsContent>
  );
};
