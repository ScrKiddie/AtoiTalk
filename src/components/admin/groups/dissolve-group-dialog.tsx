import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface DissolveGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  onConfirm: () => void;
  isPending: boolean;
}

export function DissolveGroupDialog({
  open,
  onOpenChange,
  groupName,
  onConfirm,
  isPending,
}: DissolveGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dissolve Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to dissolve <strong>{groupName}</strong>? This action cannot be
            undone and all members will be removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dissolve Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
