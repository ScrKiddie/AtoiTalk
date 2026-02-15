/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import * as path from "node:path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "admin-bundle": [
            "./src/pages/admin/dashboard.tsx",
            "./src/pages/admin/users.tsx",
            "./src/layouts/admin-layout.tsx",
          ],
        },
      },
    },
  },
});
