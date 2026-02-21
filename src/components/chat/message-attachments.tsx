import AttachmentCard from "@/components/attachment-card";
import { GlobalLightbox } from "@/components/ui/lightbox";
import { useRefreshMedia } from "@/hooks/mutations/use-refresh-media";
import { errorLog } from "@/lib/logger";
import { toast } from "@/lib/toast";
import { Media, Message } from "@/types";
import { isAxiosError } from "axios";
import { FileX, ImageOff } from "lucide-react";
import React, { useState } from "react";

interface MessageAttachmentsProps {
  message: Message;
  isCurrentUser: boolean;
}

export const MessageAttachments = ({ message, isCurrentUser }: MessageAttachmentsProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { mutateAsync: refreshMedia } = useRefreshMedia(message.chat_id);

  const handleRefresh = async (mediaId: string) => {
    await refreshMedia({ mediaId, messageId: message.id });
  };

  const attachments = message.attachments || [];

  const { images, nonImages, slides } = React.useMemo(() => {
    const attachs = message.attachments || [];
    if (attachs.length === 0) return { images: [], nonImages: [], slides: [] };

    const imgs = attachs.filter(
      (att): att is Media => att !== null && !att.is_deleted && att.mime_type.startsWith("image/")
    );
    const nonImgs = attachs.filter(
      (att): att is Media => att !== null && !att.mime_type.startsWith("image/")
    );
    const slds = imgs.map((img) => ({
      src: img.url,
      alt: img.original_name,
      mediaId: img.id,
      messageId: message.id,
    }));

    return { images: imgs, nonImages: nonImgs, slides: slds };
  }, [message.attachments, message.id]);

  const deletedImages = React.useMemo(() => {
    const attachs = message.attachments || [];
    return attachs.filter(
      (att): att is Media => att !== null && !!att.is_deleted && att.mime_type.startsWith("image/")
    );
  }, [message.attachments]);

  if (attachments.length === 0) return null;

  return (
    <>
      {nonImages.map((item, index) => (
        <div key={index} className="w-full min-w-0">
          {item.is_deleted ? (
            <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50 text-muted-foreground text-sm">
              <FileX className="h-4 w-4 shrink-0" />
              <span>Attachment has been deleted</span>
            </div>
          ) : (
            <AttachmentCard
              file={item}
              isSender={isCurrentUser}
              onClick={async () => {
                let currentUrl = item.url;
                const downloadFile = async (url: string) => {
                  const response = await fetch(url);
                  if (!response.ok) {
                    const error = new Error(response.statusText) as Error & { status: number };
                    error.status = response.status;
                    throw error;
                  }

                  const blob = await response.blob();
                  const uniqueUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.style.display = "none";
                  a.href = uniqueUrl;
                  a.download = item.original_name || "download";
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(uniqueUrl);
                  document.body.removeChild(a);
                };

                try {
                  await downloadFile(currentUrl);
                } catch (error) {
                  errorLog("Download failed, attempting refresh...", error);

                  try {
                    const { newUrl } = await refreshMedia({
                      mediaId: item.id,
                      messageId: message.id,
                    });

                    currentUrl = newUrl;
                    await downloadFile(newUrl);
                  } catch (retryError) {
                    errorLog("Download failed after refresh", retryError);
                    if (isAxiosError(retryError) && retryError.response?.status === 403) {
                      toast.error("Attachment has been deleted", {
                        id: "download-failed",
                      });
                    } else if (
                      retryError instanceof Error &&
                      retryError.message === "File not found"
                    ) {
                      toast.error("File not found (might have been deleted by the server).", {
                        id: "download-failed",
                      });
                    } else {
                      toast.error("Failed to download file.", {
                        id: "download-failed",
                      });
                    }
                  }
                }
              }}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      ))}

      {(images.length > 0 || deletedImages.length > 0) && (
        <div
          className={`grid gap-1 overflow-hidden rounded-md max-w-full w-full ${images.length + deletedImages.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {deletedImages.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-md bg-muted col-span-1 aspect-square flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageOff className="size-8" />
                <span className="text-xs">Deleted</span>
              </div>
            </div>
          ))}
          {images.map((item, index) => {
            const totalVisual = images.length + deletedImages.length;
            const isSingle = totalVisual === 1;
            const isThree = totalVisual === 3;
            const isMultiOdd = totalVisual > 1 && totalVisual % 2 !== 0;

            const adjustedIndex = index + deletedImages.length;
            const isHero = isThree && adjustedIndex === 0;

            const isFooter = !isThree && isMultiOdd && adjustedIndex === totalVisual - 1;

            const spanClass =
              isHero || isFooter ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square";

            const singleClass = "col-span-1 aspect-square";

            return (
              <div
                key={item.id}
                className={`relative overflow-hidden rounded-md bg-muted ${isCurrentUser ? "theme-revert" : ""} ${isSingle ? singleClass : spanClass}`}
              >
                <AttachmentCard
                  file={item}
                  isSender={isCurrentUser}
                  onClick={() => {}}
                  onImageClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                  onRefresh={handleRefresh}
                />

                <div className="absolute inset-0 rounded-md ring-1 ring-inset pointer-events-none ring-primary/20" />
              </div>
            );
          })}
        </div>
      )}

      <GlobalLightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
        showThumbnails={true}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
};
