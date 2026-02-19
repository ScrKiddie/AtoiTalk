import { AuthLayout } from "@/components/auth/auth-layout";
import { Captcha, CaptchaHandle } from "@/components/auth/captcha";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { useResetPassword, useSendOTP } from "@/hooks/queries";
import { formatBanMessage } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import { emailSchema, otpSchema, passwordSchema } from "@/lib/validators";
import { ApiError } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as z from "zod";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { mutate: resetPassword, isPending: isResetPending } = useResetPassword();
  const { mutate: sendOTP, isPending: isSendingOTP } = useSendOTP();

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isCaptchaSolving, setIsCaptchaSolving] = useState(true);
  const captchaRef = useRef<CaptchaHandle>(null);
  const isSendingOTPRef = useRef(false);

  const code = searchParams.get("code");
  const email = searchParams.get("email");

  const formSchema = z
    .object({
      code: otpSchema,
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords do not match.",
          path: ["confirmPassword"],
        });
      }
    });

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      code: code || "",
      email: email || "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (code) form.setValue("code", code);
    if (email) form.setValue("email", email);
  }, [code, email, form]);

  const onResend = async () => {
    const isEmailValid = await form.trigger("email");
    if (!isEmailValid) return;

    isSendingOTPRef.current = true;
    const currentEmail = form.getValues("email")?.trim();

    if (!captchaToken) {
      toast.error("Please wait for Captcha verification");
      isSendingOTPRef.current = false;
      return;
    }

    sendOTP(
      {
        email: currentEmail,
        mode: "reset",
        captcha_token: captchaToken,
      },
      {
        onSuccess: () => {
          toast.success("OTP sent to your email");
          captchaRef.current?.reset();
          setCaptchaToken(null);
          setIsCaptchaSolving(true);
          isSendingOTPRef.current = false;
        },
        onError: (error: AxiosError<ApiError, unknown>) => {
          toast.error(error.response?.data?.error || "Failed to send OTP");
          captchaRef.current?.reset();
          setCaptchaToken(null);
          setIsCaptchaSolving(true);
          isSendingOTPRef.current = false;
        },
      }
    );
  };

  function onSubmit(values: FormValues) {
    if (!captchaToken) {
      toast.error("Please wait for Captcha verification");
      return;
    }

    resetPassword(
      {
        email: values.email.trim(),
        password: values.password,
        confirm_password: values.confirmPassword,
        code: values.code.trim(),
        captcha_token: captchaToken,
      },
      {
        onSuccess: () => {
          toast.success("Password reset successfully");
          navigate("/login");
        },
        onError: (error: AxiosError<ApiError, unknown>) => {
          const msg = error.response?.data?.error || "Password reset failed";
          toast.error(formatBanMessage(msg));
          captchaRef.current?.reset();
          setCaptchaToken(null);
          setIsCaptchaSolving(true);
        },
      }
    );
  }

  const errorVariants = {
    hidden: { opacity: 0, y: -5, height: 0, marginTop: 0 },
    visible: { opacity: 1, y: 0, height: "auto", marginTop: 12 },
    exit: { opacity: 0, y: -5, height: 0, marginTop: 0 },
  };

  return (
    <AuthLayout description="Create a new password for your account.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <OtpInput
            control={form.control}
            isSendingOTP={isSendingOTP}
            isCaptchaSolving={isCaptchaSolving}
            captchaToken={captchaToken}
            onResend={onResend}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel>New Password</FormLabel>
                <FormControl className="mt-3">
                  <PasswordInput placeholder="New Password" {...field} />
                </FormControl>
                <AnimatePresence mode="wait">
                  {fieldState.error && (
                    <motion.div
                      variants={errorVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <FormMessage />
                    </motion.div>
                  )}
                </AnimatePresence>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel>Confirm Password</FormLabel>
                <FormControl className="mt-3">
                  <PasswordInput placeholder="Confirm Password" {...field} />
                </FormControl>
                <AnimatePresence mode="wait">
                  {fieldState.error && (
                    <motion.div
                      variants={errorVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <FormMessage />
                    </motion.div>
                  )}
                </AnimatePresence>
              </FormItem>
            )}
          />

          <Captcha
            ref={captchaRef}
            onVerify={(token) => {
              setCaptchaToken(token);
              setIsCaptchaSolving(false);
            }}
            onError={() => {
              setCaptchaToken(null);
              setIsCaptchaSolving(true);
              toast.error("Failed to load captcha, retrying...");
            }}
            onExpire={() => {
              setCaptchaToken(null);
              setIsCaptchaSolving(true);
              captchaRef.current?.reset();
            }}
          />

          <Button
            type="submit"
            className="w-full relative"
            disabled={isResetPending || isCaptchaSolving || !captchaToken}
          >
            <span className={isResetPending || isCaptchaSolving ? "opacity-0" : ""}>
              Reset Password
            </span>
            {(isResetPending || isCaptchaSolving) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner className="size-4" />
              </div>
            )}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Remember password?{" "}
        <Button
          variant="link"
          className="p-0 h-auto hover:no-underline hover:opacity-80 transition-opacity"
          onClick={() => navigate("/login")}
        >
          Login
        </Button>
      </p>
    </AuthLayout>
  );
}
