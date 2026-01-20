import AttachmentCard from "@/components/attachment-card";
import { GlobalLightbox } from "@/components/ui/lightbox";
import { useRefreshMedia } from "@/hooks/use-refresh-media";
import { toast } from "@/lib/toast";
import { Media, Message } from "@/types";
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
      (att): att is Media => att !== null && att.mime_type.startsWith("image/")
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
  }, [message.attachments]);

  if (attachments.length === 0) return null;

  return (
    <>
      {nonImages.map((item, index) => (
        <div key={index} className="w-full min-w-0">
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
                console.error("Download failed, attempting refresh...", error);

                try {
                  const { newUrl } = await refreshMedia({
                    mediaId: item.id,
                    messageId: message.id,
                  });

                  currentUrl = newUrl;
                  await downloadFile(newUrl);
                } catch (retryError) {
                  console.error("Download failed after refresh", retryError);
                  if (retryError instanceof Error && retryError.message === "File not found") {
                    toast.error("File tidak ditemukan (mungkin sudah dihapus oleh server).", {
                      id: "download-failed",
                    });
                  } else {
                    toast.error("Gagal mendownload file.", { id: "download-failed" });
                  }
                }
              }
            }}
            onRefresh={handleRefresh}
          />
        </div>
      ))}

      {images.length > 0 && (
        <div
          className={`grid gap-1 overflow-hidden rounded-md max-w-full w-full ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {images.map((item, index) => {
            const isSingle = images.length === 1;
            const isThree = images.length === 3;
            const isMultiOdd = images.length > 1 && images.length % 2 !== 0;

            const isHero = isThree && index === 0;

            const isFooter = !isThree && isMultiOdd && index === images.length - 1;

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
