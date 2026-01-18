import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useUnblockUser } from "@/hooks/mutations/use-block-user";

interface UnblockUserDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  overlayClassName?: string;
}

export function UnblockUserDialog({
  userId,
  open,
  onOpenChange,
  className,
  overlayClassName,
}: UnblockUserDialogProps) {
  const { mutate: unblockUser, isPending } = useUnblockUser();

  const handleConfirm = () => {
    if (userId) {
      unblockUser(userId, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      isLoading={isPending}
      title="Unblock User"
      description="Are you sure you want to unblock this user? You will be able to receive messages from them again."
      confirmText="Unblock"
      variant="destructive"
      onConfirm={handleConfirm}
      className={className}
      overlayClassName={overlayClassName}
    />
  );
}
