import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

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
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dissolve Group"
      description={`Are you sure you want to dissolve "${groupName}"? This action cannot be undone and all members will be removed.`}
      confirmText="Dissolve Group"
      cancelText="Cancel"
      variant="destructive"
      onConfirm={onConfirm}
      isLoading={isPending}
    />
  );
}
