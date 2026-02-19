import AttachmentCard from "@/components/attachment-card";
import { EditMessage, Media } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import React from "react";

interface ChatAttachmentPreviewProps {
  attachments: Media[];
  editMessage: EditMessage | null;
  isGlobalUploading?: boolean;
  isSending?: boolean;
  isEditing?: boolean;
  fileListRef: React.RefObject<HTMLDivElement>;
  onRefreshMedia: (mediaId: string) => Promise<void>;
  onRemoveAttachment: (mediaId: string) => void;
  onRemoveEditAttachment: (index: number) => void;
}

export function ChatAttachmentPreview({
  attachments,
  editMessage,
  isGlobalUploading,
  isSending,
  isEditing,
  fileListRef,
  onRefreshMedia,
  onRemoveAttachment,
  onRemoveEditAttachment,
}: ChatAttachmentPreviewProps) {
  const hasAttachments =
    attachments.length > 0 || editMessage?.attachments?.some((item) => !item.delete);

  if (!hasAttachments) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div
        ref={fileListRef}
        className={`max-h-[7.8rem] gap-[8px] flex-col flex ${isGlobalUploading || isSending || isEditing ? "overflow-hidden opacity-50 pointer-events-none" : "overflow-auto"}`}
      >
        <AnimatePresence initial={false}>
          {editMessage &&
            editMessage.attachments &&
            editMessage.attachments.map(
              (item, index) =>
                item &&
                !item.delete && (
                  <motion.div
                    key={`edit-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AttachmentCard
                      file={item}
                      isSender={false}
                      isEditMode={true}
                      disabled={isGlobalUploading || isSending || isEditing}
                      onRefresh={onRefreshMedia}
                      onClick={() => onRemoveEditAttachment(index)}
                    />
                  </motion.div>
                )
            )}

          {attachments.map((media) => (
            <motion.div
              key={`att-${media.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <AttachmentCard
                file={media}
                isSender={false}
                isEditMode={true}
                disabled={isGlobalUploading || isSending || isEditing}
                onRefresh={onRefreshMedia}
                onClick={() => onRemoveAttachment(media.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
