import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface ChatRetryProps {
  onRetry: () => void;
  title?: string;
  description?: string;
}

export const ChatRetry = ({
  onRetry,
  title = "Failed to load messages",
  description = "We couldn't reach our servers. Please check your internet connection.",
}: ChatRetryProps) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center w-full h-full gap-3 p-4 bg-sidebar">
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="gap-2 mt-2 bg-background dark:bg-black hover:bg-accent hover:text-accent-foreground items-center"
      >
        <RefreshCcw className="size-4" />
        <span>Retry</span>
      </Button>
    </div>
  );
};
