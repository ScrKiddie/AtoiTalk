import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useBlockUser, useUnblockUser } from "@/hooks/mutations/use-block-user";
import { useState } from "react";

interface BlockUserDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: "block" | "unblock";
  className?: string;
  overlayClassName?: string;
  modal?: boolean;
}

const config = {
  block: {
    title: "Block User",
    description: "Are you sure you want to block this user? They will not be able to message you.",
    confirmText: "Block",
  },
  unblock: {
    title: "Unblock User",
    description:
      "Are you sure you want to unblock this user? You will be able to receive messages from them again.",
    confirmText: "Unblock",
  },
} as const;

export function BlockUserDialog({
  userId,
  open,
  onOpenChange,
  action = "block",
  className,
  overlayClassName,
  modal = true,
}: BlockUserDialogProps) {
  const { mutate: blockUser, isPending: isBlockPending } = useBlockUser();
  const { mutate: unblockUser, isPending: isUnblockPending } = useUnblockUser();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutate = action === "block" ? blockUser : unblockUser;
  const isPending = action === "block" ? isBlockPending : isUnblockPending;
  const { title, description, confirmText } = config[action];

  const handleConfirm = () => {
    if (userId && !isSubmitting) {
      setIsSubmitting(true);
      mutate(userId, {
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
      title={title}
      description={description}
      confirmText={confirmText}
      variant="destructive"
      onConfirm={handleConfirm}
      className={className}
      overlayClassName={overlayClassName}
      modal={modal}
    />
  );
}
