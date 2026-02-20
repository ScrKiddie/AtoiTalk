import { errorLog } from "@/lib/logger";
import { mediaService } from "@/services/media.service";
import { useMutation } from "@tanstack/react-query";

export const useUploadMedia = () => {
  return useMutation({
    mutationFn: ({
      file,
      captchaToken,
      signal,
    }: {
      file: File;
      captchaToken: string;
      signal?: AbortSignal;
    }) => mediaService.uploadMedia(file, captchaToken, signal),
    onError: (error) => {
      if (
        error.name === "Aborted" ||
        error.message === "aborted" ||
        error.name === "CanceledError"
      ) {
        return;
      }
      errorLog("Upload failed in mutation:", error);
    },
  });
};
