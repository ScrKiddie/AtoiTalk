import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";

interface ResetGroupInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    reset_name: boolean;
    reset_description: boolean;
    reset_avatar: boolean;
  }) => void;
  isPending: boolean;
}

export function ResetGroupInfoDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ResetGroupInfoDialogProps) {
  const [resetName, setResetName] = useState(false);
  const [resetDescription, setResetDescription] = useState(false);
  const [resetAvatar, setResetAvatar] = useState(false);

  const handleSubmit = () => {
    onConfirm({
      reset_name: resetName,
      reset_description: resetDescription,
      reset_avatar: resetAvatar,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isPending && onOpenChange(val)}>
      <DialogContent
        onInteractOutside={(e) => isPending && e.preventDefault()}
        onEscapeKeyDown={(e) => isPending && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Reset Group Info</DialogTitle>
          <DialogDescription>Select which information to reset to defaults.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={resetAvatar}
              onChange={(e) => setResetAvatar(e.target.checked)}
              className="rounded"
              disabled={isPending}
            />
            <span>Reset Avatar</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={resetName}
              onChange={(e) => setResetName(e.target.checked)}
              className="rounded"
              disabled={isPending}
            />
            <span>Reset Name</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={resetDescription}
              onChange={(e) => setResetDescription(e.target.checked)}
              className="rounded"
              disabled={isPending}
            />
            <span>Reset Description</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={(!resetName && !resetDescription && !resetAvatar) || isPending}
            className="relative"
          >
            <span className={isPending ? "opacity-0" : ""}>Reset Info</span>
            {isPending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner className="size-4 text-primary-foreground" />
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
