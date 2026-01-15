import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store";
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      useAuthStore.getState().logout();

      const currentPath = window.location.pathname;
      if (
        !currentPath.startsWith("/login") &&
        !currentPath.startsWith("/register") &&
        !currentPath.startsWith("/forgot")
      ) {
        window.dispatchEvent(new Event("unauthorized"));
      }
    }

    if (status === 429) {
      const message = data?.error || "Too many requests. Please try again later.";
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
