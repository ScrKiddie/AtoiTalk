import { Captcha, CaptchaHandle } from "@/components/captcha";
import Logo from "@/components/logo.tsx";
import { ModeToggle } from "@/components/mode-toggle.tsx";
import { useTheme } from "@/components/theme-provider.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner";
import {
  useRegister,
  useResetPassword,
  useSendOTP,
  useGoogleLogin as useServerGoogleLogin,
} from "@/hooks/queries";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import * as z from "zod";

import { PasswordInput } from "@/components/ui/password-input";

const Verify = () => {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { mutate: register, isPending: isRegisterPending } = useRegister();
  const { mutate: resetPassword, isPending: isResetPending } = useResetPassword();
  const { mutate: sendOTP, isPending: isSendingOTP } = useSendOTP();
  const { isPending: isGooglePending, mutate: mutateGoogleLogin } = useServerGoogleLogin();

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isCaptchaSolving, setIsCaptchaSolving] = useState(true);
  const [isGooglePopupOpen, setIsGooglePopupOpen] = useState(false);
  const captchaRef = useRef<CaptchaHandle>(null);
  const isSendingOTPRef = useRef(false);

  const isRegister = location.pathname === "/register" || searchParams.get("mode") === "register";
  const isReset = location.pathname === "/forgot" || searchParams.get("mode") === "reset";

  const code = searchParams.get("code");
  const email = searchParams.get("email");

  const formSchema = useMemo(() => {
    const baseSchema = z.object({
      code: otpSchema,
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
      username: z.string().optional(),
      name: z.string().optional(),
    });

    if (isRegister) {
      return baseSchema.extend({
        username: usernameSchema,
        name: nameSchema,
      });
    }

    return baseSchema.superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords do not match.",
          path: ["confirmPassword"],
        });
      }
    });
  }, [isRegister]);

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
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (code) {
      form.setValue("code", code);
    }
    if (email) {
      form.setValue("email", email);
    }
  }, [code, email, form]);

  useEffect(() => {
    if (!isGooglePopupOpen) return;

    let timeoutId: NodeJS.Timeout;

    const handleFocus = () => {
      timeoutId = setTimeout(() => {
        setIsGooglePopupOpen(false);
      }, 1000);
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
            onSuccess: () => {
              navigate("/");
            },
            onError: (error: AxiosError<ApiError, unknown>) => {
              const msg = error.response?.data?.error || "Google login failed";
              toast.error(msg, { id: "google-error" });
            },
          }
        );
      } else {
        toast.error("Failed to get Google authorization code");
      }
    },
    onError: () => {
      setIsGooglePopupOpen(false);
      toast.error("Google login failed", { id: "google-fail" });
    },
    flow: "auth-code",
  });

  const handleGoogleClick = () => {
    setIsGooglePopupOpen(true);
    googleLogin();
  };

  function onSubmit(values: FormValues) {
    if (!captchaToken) {
      toast.error("Please wait for Captcha verification", { id: "captcha-wait" });
      return;
    }

    if (isRegister) {
      register(
        {
          email: values.email.trim(),
          username: values.username!.trim(),
          password: values.password,
          full_name: values.name!.trim(),
          code: values.code.trim(),
          captcha_token: captchaToken,
        },
        {
          onSuccess: (response) => {
            toast.success("Account created successfully", { id: "register-success" });
            useUIStore.getState().setGlobalLoading(true, "Logging In");
            setTimeout(() => {
              useAuthStore.getState().setCredentials(response.token, response.user);
              navigate("/");
              useUIStore.getState().setGlobalLoading(false);
            }, 1500);
          },
          onError: (error: AxiosError<ApiError, unknown>) => {
            toast.error(error.response?.data?.error || "Registration failed", {
              id: "register-error",
            });
            captchaRef.current?.reset();
            setCaptchaToken(null);
            setIsCaptchaSolving(true);
          },
        }
      );
    } else if (isReset) {
      resetPassword(
        {
          email: values.email.trim(),
          password: values.password,
          confirm_password: values.confirmPassword || values.password,
          code: values.code.trim(),
          captcha_token: captchaToken,
        },
        {
          onSuccess: () => {
            toast.success("Password reset successfully");
            navigate("/login");
          },
          onError: (error: AxiosError<ApiError, unknown>) => {
            toast.error(error.response?.data?.error || "Password reset failed", {
              id: "reset-error",
            });
            captchaRef.current?.reset();
            setCaptchaToken(null);
            setIsCaptchaSolving(true);
          },
        }
      );
    }
  }

  const errorVariants = {
    hidden: { opacity: 0, y: -5, height: 0, marginTop: 0 },
    visible: { opacity: 1, y: 0, height: "auto", marginTop: 12 },
    exit: { opacity: 0, y: -5, height: 0, marginTop: 0 },
  };

  const onResend = async () => {
    const isEmailValid = await form.trigger("email");
    if (!isEmailValid) return;

    isSendingOTPRef.current = true;

    const currentEmail = form.getValues("email")?.trim();

    if (!captchaToken) {
      toast.error("Please wait for Captcha verification", { id: "captcha-wait" });
      isSendingOTPRef.current = false;
      return;
    }

    sendOTP(
      {
        email: currentEmail.trim(),
        mode: isRegister ? "register" : "reset",
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
          toast.error(error.response?.data?.error || "Failed to send OTP", { id: "otp-error" });
          captchaRef.current?.reset();
          setCaptchaToken(null);
          setIsCaptchaSolving(true);
          isSendingOTPRef.current = false;
        },
      }
    );
  };

  if (!isRegister && !isReset) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4 sm:px-0">
        <Card className="w-full border-0 shadow-none rounded-none bg-transparent sm:w-[450px] px-2 sm:border sm:shadow-sm sm:rounded-xl sm:bg-card mx-auto z-20">
          <CardHeader className="p-0 sm:p-6 text-center">
            <CardTitle>404 Not Found</CardTitle>
            <CardDescription>Page not found.</CardDescription>
            <Button onClick={() => navigate("/login")} className="mt-4">
              Back to Login
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 sm:px-0">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full sm:w-auto"
      >
        <Card className="w-full border-0 shadow-none rounded-none bg-transparent sm:w-[450px] px-4 sm:border sm:shadow-sm sm:rounded-xl sm:bg-card mx-auto z-20">
          <CardHeader className="p-0 sm:p-6 ">
            <CardTitle className="flex justify-between items-center">
              <div className="flex items-center ">
                <Logo mode={theme} width={35} height={40} />
                <p className="text-4xl flex items-center gap-1">AtoiTalk</p>
              </div>
              <ModeToggle />
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Complete your details to finish registration."
                : "Create a new password for your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 pt-4 sm:pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Email</FormLabel>
                      <FormControl className="mt-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Email"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\s/g, ""))}
                            className={cn(
                              fieldState.error &&
                                "border-destructive focus-visible:ring-destructive"
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={onResend}
                            disabled={isSendingOTP || isCaptchaSolving || !captchaToken}
                            className="w-[110px] relative"
                          >
                            <span className={isSendingOTP ? "opacity-0" : ""}>Request OTP</span>
                            {isSendingOTP && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Spinner className="size-4" />
                              </div>
                            )}
                          </Button>
                        </div>
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
                  name="code"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>OTP Code</FormLabel>
                      <FormControl className="mt-3">
                        <Input
                          placeholder="OTP Code"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            field.onChange(val);
                          }}
                          maxLength={6}
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
                {isRegister && (
                  <>
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
                                const normalized = e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9_]/g, "");
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
                  </>
                )}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>{isReset ? "New Password" : "Password"}</FormLabel>
                      <FormControl className="mt-3">
                        <PasswordInput
                          placeholder={isReset ? "New Password" : "Password"}
                          {...field}
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
                {!isRegister && (
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
                )}
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
                    isResetPending ||
                    isCaptchaSolving ||
                    !captchaToken ||
                    isGooglePending ||
                    isGooglePopupOpen
                  }
                >
                  <span
                    className={
                      isRegisterPending || isResetPending || isCaptchaSolving ? "opacity-0" : ""
                    }
                  >
                    {isRegister ? "Register" : "Reset Password"}
                  </span>
                  {(isRegisterPending || isResetPending || isCaptchaSolving) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Spinner className="size-4" />
                    </div>
                  )}
                </Button>
              </form>
            </Form>

            {isRegister && (
              <>
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
                  disabled={
                    isGooglePending || isGooglePopupOpen || isRegisterPending || isResetPending
                  }
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
              </>
            )}

            <p className="text-center text-sm text-muted-foreground mt-4">
              {isRegister ? "Already have an account?" : "Remember password?"}{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/login")}>
                Login
              </Button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Verify;
