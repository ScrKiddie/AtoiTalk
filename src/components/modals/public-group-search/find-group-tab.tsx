import { InfiniteGroupList } from "@/components/infinite-group-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { useJoinGroup } from "@/hooks/mutations/use-group-join";
import { useSearchPublicGroups } from "@/hooks/queries/use-chat";
import { PublicGroupDTO } from "@/types";
import { Check, Globe, Loader2, LogIn, Search } from "lucide-react";
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
    enabled: activeTab === "find" && !!trimmedSearch && trimmedSearch.length >= 3,
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
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-muted/10 -mx-6 px-6 mt-4">
        <InfiniteGroupList
          groups={groups}
          isLoading={isSearching}
          isError={!!isError}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={!!isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          refetch={refetch}
          emptyMessage={debouncedSearch ? "No groups found." : "Type to search public groups."}
          loadingHeight="h-10"
          showBorder={false}
          skeletonButtonCount={1}
          skeletonCount={5}
          resetKey={debouncedSearch}
          renderActions={(group) => {
            const isCurrentJoining = joiningGroupId === group.id;

            return (
              <div
                key={group.id}
                className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors gap-2"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <Avatar>
                    <AvatarImage src={group.avatar || undefined} />
                    <AvatarFallback>
                      <Globe className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 w-full text-left">
                    <span className="text-sm font-medium truncate">{group.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate max-w-[120px]">
                        {group.description || "No description"}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant={group.is_member ? "ghost" : "default"}
                  className="size-8"
                  onClick={() => handleJoin(group)}
                  disabled={isCurrentJoining || (isJoining && !!joiningGroupId)}
                >
                  {isCurrentJoining ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : group.is_member ? (
                    <Check className="size-4 text-primary" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                </Button>
              </div>
            );
          }}
        />
      </div>
    </TabsContent>
  );
};
