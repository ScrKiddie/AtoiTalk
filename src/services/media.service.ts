import api from "@/lib/axios";
import type { ApiResponse, Media } from "@/types";

/**
 * Media Service - handles media upload API calls
 */
export const mediaService = {
  /**
   * Upload a media file (image, video, file, audio)
   */
  async uploadMedia(file: File, signal?: AbortSignal): Promise<Media> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<ApiResponse<Media>>("/api/media/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
    });
    return response.data.data;
  },

  /**
   * Refresh a presigned URL for a media file
   */
  async refreshMediaUrl(mediaId: string): Promise<string> {
    const response = await api.get<ApiResponse<{ url: string }>>(`/api/media/${mediaId}/url`);
    return response.data.data.url;
  },
};

export default mediaService;
