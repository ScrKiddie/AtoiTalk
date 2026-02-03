import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useBlockUser } from "@/hooks/mutations/use-block-user";
import { useState } from "react";

interface BlockUserDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  overlayClassName?: string;
  modal?: boolean;
}

export function BlockUserDialog({
  userId,
  open,
  onOpenChange,
  className,
  overlayClassName,
  modal = true,
}: BlockUserDialogProps) {
  const { mutate: blockUser, isPending } = useBlockUser();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (userId && !isSubmitting) {
      setIsSubmitting(true);
      blockUser(userId, {
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
      title="Block User"
      description="Are you sure you want to block this user? They will not be able to message you."
      confirmText="Block"
      variant="destructive"
      onConfirm={handleConfirm}
      className={className}
      overlayClassName={overlayClassName}
      modal={modal}
    />
  );
}
