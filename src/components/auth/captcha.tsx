import { useAuthStore } from "@/store";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error?: unknown) => void;
  onExpire?: () => void;
  action?: string;
}

export interface CaptchaHandle {
  reset: () => void;
  getResponse: () => string | undefined;
}

export const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(
  ({ onVerify, onError, onExpire, action }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);
    const existingToken = useAuthStore((s) => s.captchaToken);
    const setCaptchaToken = useAuthStore((s) => s.setCaptchaToken);
    const hasRestoredRef = useRef(false);
    const retryResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearRetryResetTimer = () => {
      if (retryResetTimerRef.current) {
        clearTimeout(retryResetTimerRef.current);
        retryResetTimerRef.current = null;
      }
    };

    const scheduleWidgetReset = () => {
      clearRetryResetTimer();
      retryResetTimerRef.current = setTimeout(() => {
        turnstileRef.current?.reset();
        retryResetTimerRef.current = null;
      }, 1200);
    };

    useImperativeHandle(ref, () => ({
      reset: () => {
        clearRetryResetTimer();
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      },
      getResponse: () => turnstileRef.current?.getResponse(),
    }));

    useEffect(() => {
      if (existingToken && !hasRestoredRef.current) {
        hasRestoredRef.current = true;
        onVerify(existingToken);
      }
    }, [existingToken, onVerify]);

    useEffect(() => {
      return () => {
        clearRetryResetTimer();
      };
    }, []);

    const handleVerify = (token: string) => {
      clearRetryResetTimer();
      setCaptchaToken(token);
      onVerify(token);
    };

    const handleError = (error?: unknown) => {
      setCaptchaToken(null);
      scheduleWidgetReset();
      onError?.(error);
    };

    const handleExpire = () => {
      setCaptchaToken(null);
      onExpire?.();
    };

    return (
      <div className="fixed -z-50 top-0 left-0 opacity-0 pointer-events-none">
        <Turnstile
          ref={turnstileRef}
          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          onSuccess={handleVerify}
          onError={handleError}
          onExpire={handleExpire}
          options={{
            action,
            size: "invisible",
            retry: "auto",
            retryInterval: 2000,
            refreshExpired: "auto",
            refreshTimeout: "auto",
          }}
        />
      </div>
    );
  }
);

Captcha.displayName = "Captcha";
