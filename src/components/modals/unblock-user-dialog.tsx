import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useUnblockUser } from "@/hooks/mutations/use-block-user";
import { useState } from "react";

interface UnblockUserDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  overlayClassName?: string;
  modal?: boolean;
}

export function UnblockUserDialog({
  userId,
  open,
  onOpenChange,
  className,
  overlayClassName,
  modal = true,
}: UnblockUserDialogProps) {
  const { mutate: unblockUser, isPending } = useUnblockUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (userId && !isSubmitting) {
      setIsSubmitting(true);
      unblockUser(userId, {
        onSuccess: () => {
          onOpenChange(false);
          setIsSubmitting(false);
        },
        onError: () => {
          setIsSubmitting(false);
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
      modal={modal}
    />
  );
}
