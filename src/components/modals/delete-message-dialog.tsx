import { ConfirmationDialog } from "@/components/ui/confirmation-dialog.tsx";
import { EditMessage, Message } from "@/types";

interface DeleteMessageDialogProps {
  showDeleteModal: boolean;
  setShowDeleteModal: (show: boolean) => void;
  messageToDelete: string | null;
  editMessage: EditMessage | null;
  replyTo: Message | null;
  setEditMessage: (editMessage: EditMessage | null) => void;
  setAttachmentMode: (mode: boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setReplyTo: (replyTo: Message | null) => void;
  onConfirmDelete: () => void;
  isLoading?: boolean;
}

export function DeleteMessageDialog({
  showDeleteModal,
  setShowDeleteModal,
  messageToDelete,
  editMessage,
  replyTo,
  setEditMessage,
  setAttachmentMode,
  textareaRef,
  setReplyTo,
  onConfirmDelete,
  isLoading = false,
}: DeleteMessageDialogProps) {
  const handleDelete = () => {
    if (messageToDelete !== null) {
      if (messageToDelete === editMessage?.id) {
        setEditMessage(null);
        setAttachmentMode(false);
        if (textareaRef.current) {
          textareaRef.current.value = "";
          textareaRef.current.focus();
        }
      }
      if (messageToDelete === replyTo?.id) {
        setReplyTo(null);
        if (textareaRef.current) {
          textareaRef.current.value = "";
          textareaRef.current.focus();
        }
      }
    }
    onConfirmDelete();
  };

  return (
    <ConfirmationDialog
      open={showDeleteModal}
      onOpenChange={setShowDeleteModal}
      title="Delete Message"
      description="Are you sure you want to delete this message? This action cannot be undone."
      confirmText="Delete"
      variant="destructive"
      onConfirm={handleDelete}
      isLoading={isLoading}
    />
  );
}
