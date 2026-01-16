import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";

interface ChatHeaderSkeletonProps {
  onRetry?: () => void;
  isError?: boolean;
}

export function ChatHeaderSkeleton({ onRetry, isError }: ChatHeaderSkeletonProps) {
  return (
    <header className="outline-1 dark:outline-[#212224] outline-[#e4e4e7] z-50 bg-background flex h-[63px] shrink-0 items-center gap-2">
      <div className="flex gap-2 px-4 w-full justify-between items-center">
        <div className="flex items-center justify-center gap-2">
          <SidebarTrigger className="mr-1" />

          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <Skeleton className="h-[13px] w-32 mb-1" />
              <Skeleton className="h-[13px] w-24 rounded-full" />
            </div>
          </div>
        </div>

        {isError && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive h-8 w-8"
            onClick={onRetry}
            title="Retry fetch"
          >
            <RefreshCcw className="size-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
