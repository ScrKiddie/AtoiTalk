import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useBlockUser } from "@/hooks/mutations/use-block-user";

interface BlockUserDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  overlayClassName?: string;
}

export function BlockUserDialog({
  userId,
  open,
  onOpenChange,
  className,
  overlayClassName,
}: BlockUserDialogProps) {
  const { mutate: blockUser, isPending } = useBlockUser();

  const handleConfirm = () => {
    if (userId) {
      blockUser(userId, {
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
      title="Block User"
      description="Are you sure you want to block this user? They will not be able to message you."
      confirmText="Block"
      variant="destructive"
      onConfirm={handleConfirm}
      className={className}
      overlayClassName={overlayClassName}
    />
  );
}
