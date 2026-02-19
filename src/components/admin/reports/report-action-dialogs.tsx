import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ReportDetailResponse, ReportListResponse } from "@/services/admin.service";
import { AlertCircle } from "lucide-react";

interface ReportActionDialogsProps {
  resolveOpen: boolean;
  onResolveOpenChange: (open: boolean) => void;
  rejectOpen: boolean;
  onRejectOpenChange: (open: boolean) => void;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  resolveNotes: string;
  onResolveNotesChange: (value: string) => void;
  selectedReport: ReportListResponse | ReportDetailResponse | null;
  onResolve: () => void;
  onReject: () => void;
  onDelete: () => void;
  isPending: boolean;
  isDeletePending: boolean;
}

export function ReportActionDialogs({
  resolveOpen,
  onResolveOpenChange,
  rejectOpen,
  onRejectOpenChange,
  deleteOpen,
  onDeleteOpenChange,
  resolveNotes,
  onResolveNotesChange,
  selectedReport,
  onResolve,
  onReject,
  onDelete,
  isPending,
  isDeletePending,
}: ReportActionDialogsProps) {
  return (
    <>
      <Dialog open={resolveOpen} onOpenChange={(val) => !isPending && onResolveOpenChange(val)}>
        <DialogContent
          onInteractOutside={(e) => isPending && e.preventDefault()}
          onEscapeKeyDown={(e) => isPending && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Mark this report as resolved. You can add notes about the action taken.
            </DialogDescription>
          </DialogHeader>

          {selectedReport?.target_type === "message" && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Warning: Resolving this report will{" "}
                <strong>permanently delete the reported message content</strong>.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Action taken (e.g., User banned, content removed)..."
              value={resolveNotes}
              onChange={(e) => onResolveNotesChange(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onResolveOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={onResolve} disabled={isPending} className="relative">
              <span className={isPending ? "opacity-0" : ""}>Resolve Report</span>
              {isPending && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="size-4 text-primary-foreground" />
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={(val) => !isPending && onRejectOpenChange(val)}>
        <DialogContent
          onInteractOutside={(e) => isPending && e.preventDefault()}
          onEscapeKeyDown={(e) => isPending && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Reject Report</DialogTitle>
            <DialogDescription>
              Reject this report if it's invalid or requires no action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection..."
              value={resolveNotes}
              onChange={(e) => onResolveNotesChange(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onRejectOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={isPending}
              className="relative"
            >
              <span className={isPending ? "opacity-0" : ""}>Reject Report</span>
              {isPending && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="size-4 text-primary-foreground" />
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete the report from the database."
        confirmText="Delete"
        variant="destructive"
        onConfirm={onDelete}
        isLoading={isDeletePending}
      />
    </>
  );
}
