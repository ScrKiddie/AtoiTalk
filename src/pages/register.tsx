import { AuthLayout } from "@/components/auth/auth-layout";
import { OtpInput } from "@/components/auth/otp-input";
import { Captcha, CaptchaHandle } from "@/components/captcha";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useRegister, useSendOTP, useGoogleLogin as useServerGoogleLogin } from "@/hooks/queries";
import { formatBanMessage } from "@/lib/date-utils";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  emailSchema,
  nameSchema,
  otpSchema,
  passwordSchema,
  usernameSchema,
} from "@/lib/validators";
import { useAuthStore, useUIStore } from "@/store";
import { ApiError } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGoogleLogin } from "@react-oauth/google";
import { AxiosError } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as z from "zod";

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { mutate: register, isPending: isRegisterPending } = useRegister();
  const { mutate: sendOTP, isPending: isSendingOTP } = useSendOTP();
  const { isPending: isGooglePending, mutate: mutateGoogleLogin } = useServerGoogleLogin();

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isCaptchaSolving, setIsCaptchaSolving] = useState(true);
  const [isGooglePopupOpen, setIsGooglePopupOpen] = useState(false);
  const captchaRef = useRef<CaptchaHandle>(null);
  const isSendingOTPRef = useRef(false);

  const code = searchParams.get("code");
  const email = searchParams.get("email");

  const formSchema = z.object({
    code: otpSchema,
    email: emailSchema,
    password: passwordSchema,
    username: usernameSchema,
    name: nameSchema,
  });

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      code: code || "",
      email: email || "",
      username: "",
      name: "",
      password: "",
    },
  });

  useEffect(() => {
    if (code) form.setValue("code", code);
    if (email) form.setValue("email", email);
  }, [code, email, form]);

  useEffect(() => {
    if (!isGooglePopupOpen) return;
    let timeoutId: NodeJS.Timeout;
    const handleFocus = () => {
      timeoutId = setTimeout(() => setIsGooglePopupOpen(false), 1000);
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isGooglePopupOpen]);

  const googleLogin = useGoogleLogin({
    onSuccess: (response) => {
      setIsGooglePopupOpen(false);
      if (response.code) {
        mutateGoogleLogin(
          { code: response.code },
          {
            onSuccess: () => navigate("/"),
            onError: (error: AxiosError<ApiError, unknown>) => {
              const msg = error.response?.data?.error || "Google login failed";
              toast.error(formatBanMessage(msg));
            },
          }
        );
      } else {
        toast.error("Failed to get Google authorization code");
      }
    },
    onError: () => {
      setIsGooglePopupOpen(false);
      toast.error("Google login failed");
    },
    flow: "auth-code",
  });

  const handleGoogleClick = () => {
    setIsGooglePopupOpen(true);
    googleLogin();
  };

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
        mode: "register",
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

    register(
      {
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password,
        full_name: values.name.trim(),
        code: values.code.trim(),
        captcha_token: captchaToken,
      },
      {
        onSuccess: (response) => {
          toast.success("Account created successfully");
          useUIStore.getState().setGlobalLoading(true, "Logging In");
          setTimeout(() => {
            useAuthStore.getState().setCredentials(response.token, response.user);
            navigate("/");
            useUIStore.getState().setGlobalLoading(false);
          }, 1500);
        },
        onError: (error: AxiosError<ApiError, unknown>) => {
          const msg = error.response?.data?.error || "Registration failed";
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
    <AuthLayout description="Complete your details to finish registration.">
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
            name="username"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel>Username</FormLabel>
                <FormControl className="mt-3">
                  <Input
                    placeholder="Username"
                    {...field}
                    onChange={(e) => {
                      const normalized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                      field.onChange(normalized);
                    }}
                  />
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
            name="name"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel>Full Name</FormLabel>
                <FormControl className="mt-3">
                  <Input placeholder="Full Name" {...field} />
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
            name="password"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel>Password</FormLabel>
                <FormControl className="mt-3">
                  <PasswordInput placeholder="Password" {...field} />
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
            disabled={
              isRegisterPending ||
              isCaptchaSolving ||
              !captchaToken ||
              isGooglePending ||
              isGooglePopupOpen
            }
          >
            <span className={isRegisterPending || isCaptchaSolving ? "opacity-0" : ""}>
              Register
            </span>
            {(isRegisterPending || isCaptchaSolving) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner className="size-4" />
              </div>
            )}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background sm:bg-card px-4 text-xs text-muted-foreground uppercase">
          Or
        </span>
      </div>
      <Button
        variant="outline"
        className="w-full relative gap-2"
        onClick={handleGoogleClick}
        disabled={isGooglePending || isGooglePopupOpen || isRegisterPending}
        type="button"
      >
        <span
          className={cn(
            "flex items-center gap-2",
            isGooglePending || isGooglePopupOpen ? "opacity-0" : ""
          )}
        >
          <svg
            className="h-4 w-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            ></path>
          </svg>
          Register with Google
        </span>
        {(isGooglePending || isGooglePopupOpen) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-4" />
          </div>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Already have an account?{" "}
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
