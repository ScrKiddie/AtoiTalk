import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatListScroll } from "@/hooks/use-chat-list-scroll";
import { User } from "@/types";
import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect } from "react";

interface InfiniteUserListProps {
    users: User[];
    isLoading: boolean;
    isError: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    refetch: () => void;
    renderActions: (user: User) => React.ReactNode;
    emptyMessage?: string;
    loadingHeight?: string;
    showBorder?: boolean;
    skeletonButtonCount?: number;
    resetKey?: unknown;
}

export function InfiniteUserList({
    users,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    renderActions,
    emptyMessage = "No users found.",
    loadingHeight = "h-11",
    showBorder = false,
    skeletonButtonCount = 2,
    resetKey,
}: InfiniteUserListProps) {
    const { scrollRef, handleScroll, handleWheel } = useChatListScroll({
        hasNextPage,
        isFetchingNextPage,
        isError,
        fetchNextPage,
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [resetKey, scrollRef]);

    return (
        <div
            className="flex flex-col gap-2 overflow-y-auto h-full"
            ref={scrollRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
        >
            {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-2 gap-2 rounded-md">
                        <div className="flex items-center gap-3 flex-1">
                            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                            <div className="flex flex-col gap-2 w-full">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {Array.from({ length: skeletonButtonCount }).map((_, j) => (
                                <Skeleton key={j} className="size-8 rounded-md" />
                            ))}
                        </div>
                    </div>
                ))}

            {!isLoading && users.length === 0 && !isError && (
                <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
            )}

            {!isLoading && users.length === 0 && isError && (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                    <div className="space-y-1">
                        <span className="block font-semibold text-sm">Failed to load</span>
                        <p className="text-[10px] text-muted-foreground">Check your connection</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="h-7 text-xs gap-2 mt-1"
                    >
                        <RefreshCcw className="size-3.5" />
                        <span>Retry</span>
                    </Button>
                </div>
            )}

            {users.map((user) => renderActions(user))}

            {isFetchingNextPage && (
                <div
                    className={`${loadingHeight} w-full flex items-center justify-center shrink-0 ${showBorder ? "border-t border-sidebar-border" : ""}`}
                >
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}
