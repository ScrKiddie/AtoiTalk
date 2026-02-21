import { errorLog } from "@/lib/logger";
import { toast } from "@/lib/toast";
import { ReportDetailResponse } from "@/services/admin.service";
import { mediaService } from "@/services/media.service";
import { Media } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo } from "react";

export function useReportMedia(
  reportDetail: ReportDetailResponse | undefined,
  detailReportId: string | null
) {
  const queryClient = useQueryClient();

  const getAttachments = useMemo(() => {
    if (!reportDetail?.evidence_snapshot) return [];

    const rawAttachments =
      reportDetail.evidence_snapshot.attachments ||
      reportDetail.evidence_snapshot.data?.attachments ||
      [];

    return rawAttachments.map((item: string | Media, index: number) => {
      if (typeof item === "string") {
        const match = item.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
        const id = match ? match[0] : `att-${index}`;

        const fileName = item.split("/").pop()?.split("?")[0] || "attachment";

        const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        return {
          id: id,
          url: item,
          original_name: fileName,
          mime_type: isImage ? "image/jpeg" : "application/octet-stream",
          file_size: 0,
          file_name: fileName,
        } as Media;
      }
      return item as Media;
    });
  }, [reportDetail]);

  const { images, files } = useMemo(() => {
    const images: Media[] = [];
    const files: Media[] = [];
    getAttachments.forEach((att: Media) => {
      if (att.mime_type?.startsWith("image/")) {
        images.push(att);
      } else {
        files.push(att);
      }
    });
    return { images, files };
  }, [getAttachments]);

  const slides = useMemo(
    () =>
      images.map((img) => ({
        src: img.url,
        alt: img.original_name,

        mediaId: img.id,
      })),
    [images]
  );

  const handleAttachmentRefresh = async (mediaId: string): Promise<string> => {
    if (!detailReportId) return "";

    try {
      if (!mediaId || mediaId.startsWith("att-")) {
        throw new Error("Cannot refresh this attachment (missing ID)");
      }

      const newUrl = await mediaService.refreshMediaUrl(mediaId);

      queryClient.setQueryData(
        ["admin-report-detail", detailReportId],
        (oldData: ReportDetailResponse | undefined) => {
          if (!oldData || !oldData.evidence_snapshot) return oldData;

          const snapshot = oldData.evidence_snapshot;
          let updatedAttachments: (string | Media)[] = [];

          const rawAttachments = snapshot.attachments || snapshot.data?.attachments;

          if (rawAttachments) {
            updatedAttachments = rawAttachments.map((att: string | Media) => {
              if (typeof att === "string") {
                return att.includes(mediaId) ? newUrl : att;
              }
              return att.id === mediaId ? { ...att, url: newUrl } : att;
            });

            if (snapshot.attachments) {
              return {
                ...oldData,
                evidence_snapshot: {
                  ...snapshot,
                  attachments: updatedAttachments,
                },
              };
            } else if (snapshot.data?.attachments) {
              return {
                ...oldData,
                evidence_snapshot: {
                  ...snapshot,
                  data: {
                    ...snapshot.data,
                    attachments: updatedAttachments,
                  },
                },
              };
            }
          }
          return oldData;
        }
      );

      return newUrl;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        toast.error("Attachment has been deleted");
      }
      errorLog("Failed to refresh attachment", error);
      throw error;
    }
  };

  const handleDownload = async (file: Media) => {
    const currentUrl = file.url;
    if (!currentUrl) return;

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
      a.download = file.original_name || file.file_name || "download";
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
        const newUrl = await handleAttachmentRefresh(file.id);
        if (newUrl) {
          await downloadFile(newUrl);
        } else {
          throw new Error("Failed to refresh URL");
        }
      } catch (retryError) {
        errorLog("Download failed after refresh", retryError);
        if (retryError instanceof Error && retryError.message === "File not found") {
          toast.error("File not found (might have been deleted by the server).", {
            id: "download-failed",
          });
        } else {
          toast.error("Failed to download file.", { id: "download-failed" });
        }
      }
    }
  };

  return {
    images,
    files,
    slides,
    handleAttachmentRefresh,
    handleDownload,
  };
}
