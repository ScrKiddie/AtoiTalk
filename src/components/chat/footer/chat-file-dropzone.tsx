import { ChatAttachmentPreview } from "@/components/chat/footer/chat-attachment-preview";
import { Button } from "@/components/ui/button";
import * as FileUpload from "@/components/ui/file-upload";
import { EditMessage, Media } from "@/types";
import { File as FileIcon, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React from "react";

interface ChatFileDropzoneProps {
  attachmentMode: boolean;
  uploadingFiles: File[];
  onFilesChange: (files: File[]) => Promise<void>;
  isGlobalUploading: boolean;
  isSending: boolean;
  isEditing: boolean;
  isCancelling: boolean;
  isLoading?: boolean;
  attachments: Media[];
  editMessage: EditMessage | null;
  fileListRef: React.RefObject<HTMLDivElement>;
  onRefreshMedia: (mediaId: string) => Promise<void>;
  onRemoveAttachment: (mediaId: string) => void;
  onRemoveEditAttachment: (index: number) => void;
  onCancelUploads: () => void;
}

export function ChatFileDropzone({
  attachmentMode,
  uploadingFiles,
  onFilesChange,
  isGlobalUploading,
  isSending,
  isEditing,
  isCancelling,
  isLoading,
  attachments,
  editMessage,
  fileListRef,
  onRefreshMedia,
  onRemoveAttachment,
  onRemoveEditAttachment,
  onCancelUploads,
}: ChatFileDropzoneProps) {
  return (
    <AnimatePresence>
      {attachmentMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="flex justify-between items-center w-full gap-2 overflow-hidden"
        >
          <FileUpload.Root
            className={"w-full"}
            value={uploadingFiles}
            onValueChange={onFilesChange}
            multiple={true}
          >
            <FileUpload.Dropzone
              className={
                isGlobalUploading || isSending || isEditing || isCancelling
                  ? "pointer-events-none opacity-80"
                  : ""
              }
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center rounded-full border">
                  <FileUpload.Trigger
                    asChild
                    disabled={
                      isGlobalUploading || isSending || isEditing || isCancelling || isLoading
                    }
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={
                        isGlobalUploading || isSending || isEditing || isCancelling || isLoading
                      }
                    >
                      {isGlobalUploading || isCancelling ? (
                        <Loader2 className="size-6 text-muted-foreground animate-spin" />
                      ) : (
                        <FileIcon className="size-6 text-muted-foreground" />
                      )}
                    </Button>
                  </FileUpload.Trigger>
                </div>
                {isCancelling ? (
                  <>
                    <p className="font-medium text-sm">Cancelling your uploads...</p>
                    <p className="text-muted-foreground text-xs">Please wait a moment</p>
                  </>
                ) : isGlobalUploading && uploadingFiles.length > 0 ? (
                  <>
                    <p className="font-medium text-sm">Uploading your file....</p>
                    <p className="text-muted-foreground text-xs">
                      Please wait a moment <span className="text-foreground">or</span>{" "}
                      <span
                        className="text-red-500 cursor-pointer hover:text-red-400 transition-colors font-medium pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelUploads();
                        }}
                      >
                        cancel
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-sm">Drag & drop files here</p>
                    <p className="text-muted-foreground text-xs">Or click to browse</p>
                  </>
                )}
              </div>
            </FileUpload.Dropzone>

            <ChatAttachmentPreview
              attachments={attachments}
              editMessage={editMessage}
              isGlobalUploading={isGlobalUploading}
              isSending={isSending}
              isEditing={isEditing}
              fileListRef={fileListRef}
              onRefreshMedia={onRefreshMedia}
              onRemoveAttachment={onRemoveAttachment}
              onRemoveEditAttachment={onRemoveEditAttachment}
            />
          </FileUpload.Root>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
