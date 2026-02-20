/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_LOGS?: "true" | "false";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
