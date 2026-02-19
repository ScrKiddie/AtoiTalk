import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface GroupsFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  hasPrevPage: boolean;
  hasNextPage?: boolean;
}

export function GroupsFilter({
  search,
  onSearchChange,
  onPrevPage,
  onNextPage,
  hasPrevPage,
  hasNextPage,
}: GroupsFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      {(hasPrevPage || hasNextPage) && (
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={onPrevPage} disabled={!hasPrevPage}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button variant="outline" size="sm" onClick={onNextPage} disabled={!hasNextPage}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
