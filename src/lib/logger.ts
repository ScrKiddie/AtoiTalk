const isDebugLoggingEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === "true";

export const debugLog = (...args: unknown[]) => {
  if (!isDebugLoggingEnabled) return;
  console.log(...args);
};

export const errorLog = (...args: unknown[]) => {
  if (!isDebugLoggingEnabled) return;
  console.error(...args);
};
