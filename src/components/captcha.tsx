import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useImperativeHandle, useRef } from "react";

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

    useImperativeHandle(ref, () => ({
      reset: () => turnstileRef.current?.reset(),
      getResponse: () => turnstileRef.current?.getResponse(),
    }));

    return (
      <div className="fixed -z-50 top-0 left-0 opacity-0 pointer-events-none">
        <Turnstile
          ref={turnstileRef}
          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          onSuccess={onVerify}
          onError={onError}
          onExpire={onExpire}
          options={{
            action,
            size: "invisible",
          }}
        />
      </div>
    );
  }
);

Captcha.displayName = "Captcha";
