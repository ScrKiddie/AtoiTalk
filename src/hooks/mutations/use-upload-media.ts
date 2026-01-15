import { toast } from "@/lib/toast";
import { mediaService } from "@/services/media.service";
import { useMutation } from "@tanstack/react-query";

export const useUploadMedia = () => {
  return useMutation({
    mutationFn: ({ file, signal }: { file: File; signal?: AbortSignal }) =>
      mediaService.uploadMedia(file, signal),
    onError: (error) => {
      if (error.name === "CanceledError" || error.message === "canceled") {
        console.log("Upload canceled");
        return;
      }
      console.error("Upload failed:", error);
      toast.error("Failed to upload file");
    },
  });
};
