import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";

interface ReportHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export function ReportHeader({ isLoading, onRefresh }: ReportHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">Manage and resolve user reports.</p>
      </div>
      <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
