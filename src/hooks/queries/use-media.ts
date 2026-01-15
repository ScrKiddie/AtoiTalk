import { mediaService } from "@/services";
import { useMutation } from "@tanstack/react-query";

export function useUploadMedia() {
  return useMutation({
    mutationFn: (file: File) => mediaService.uploadMedia(file),
  });
}

export function useUploadMultipleMedia() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const uploads = files.map((file) => mediaService.uploadMedia(file));
      return Promise.all(uploads);
    },
  });
}
