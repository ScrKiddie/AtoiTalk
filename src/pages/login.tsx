import Logo from "@/components/logo.tsx";
import { ModeToggle } from "@/components/mode-toggle.tsx";
import { useTheme } from "@/components/providers/theme-provider";
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
import { useInitGoogleAuth, useLogin } from "@/hooks/queries";
import { formatBanMessage } from "@/lib/date-utils";
import { emailSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";

import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as z from "zod";

import { Captcha, CaptchaHandle } from "@/components/auth/captcha";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

const Login = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const formSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, { message: "Password is required." }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutate: login, isPending: isLoginPending } = useLogin();
  const { mutate: initGoogleAuth, isPending: isGoogleInitPending } = useInitGoogleAuth();

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isCaptchaSolving, setIsCaptchaSolving] = useState(true);
  const captchaRef = useRef<CaptchaHandle>(null);

  const handleGoogleClick = () => {
    initGoogleAuth(undefined, {
      onSuccess: (data) => {
        window.location.href = data.auth_url;
      },
      onError: (error) => {
        const msg = error.response?.data?.error || "Failed to initialize Google login";
        toast.error(msg);
      },
    });
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const password = values.password;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);
    const isValidLength = password.length >= 8 && password.length <= 72;

    if (!isValidLength || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      toast.error("Invalid email or password");
      return;
    }

    if (!captchaToken) {
      toast.error("Please wait for Captcha verification");
      return;
    }

    login(
      {
        email: values.email.trim(),
        password: values.password,
        captcha_token: captchaToken,
      },
      {
        onSuccess: () => {
          navigate("/");
        },
        onError: (error) => {
          let msg = error.response?.data?.error || "Invalid email or password";
          if (error.response?.status === 401) {
            msg = "Invalid email or password";
          }
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
    <div className="min-h-screen w-full flex items-center justify-center px-8 sm:px-0">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full sm:w-auto"
      >
        <Card className="w-full border-0 shadow-none rounded-none bg-transparent sm:w-[450px] px-2 sm:border sm:shadow-sm sm:rounded-xl sm:bg-card mx-auto z-20">
          <CardHeader className="p-0 sm:p-6 ">
            <CardTitle className="flex justify-between items-center">
              <div className="flex items-center ">
                <Logo mode={theme} width={35} height={40} />
                <p className="text-4xl flex items-center gap-1">AtoiTalk</p>
              </div>
              <ModeToggle />
            </CardTitle>
            <CardDescription>Please login to continue.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 pt-4 sm:pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Email</FormLabel>
                      <FormControl className="mt-3">
                        <Input
                          placeholder="Email"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.replace(/\s/g, ""))}
                        />
                      </FormControl>
                      <AnimatePresence mode="wait">
                        {form.formState.errors.email && (
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
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-normal text-sm hover:no-underline hover:opacity-80 transition-opacity"
                          type="button"
                          onClick={() => navigate("/forgot")}
                          disabled={isLoginPending || isGoogleInitPending}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <FormControl className="mt-3">
                        <PasswordInput placeholder="Password" {...field} />
                      </FormControl>
                      <AnimatePresence mode="wait">
                        {form.formState.errors.password && (
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
                    toast.error("Failed to load captcha, retrying...", {
                      id: "captcha-load-error",
                    });
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
                    isLoginPending || isGoogleInitPending || isCaptchaSolving || !captchaToken
                  }
                >
                  <span className={isLoginPending || isCaptchaSolving ? "opacity-0" : ""}>
                    Login
                  </span>
                  {(isLoginPending || isCaptchaSolving) && (
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

            <div className="relative w-full">
              <Button
                variant="outline"
                className="w-full relative gap-2"
                disabled={isLoginPending || isGoogleInitPending}
                type="button"
                onClick={handleGoogleClick}
              >
                <span
                  className={cn("flex items-center gap-2", isGoogleInitPending ? "opacity-0" : "")}
                >
                  <svg
                    className=" h-4 w-4"
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
                  Login with Google
                </span>
                {isGoogleInitPending && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner className="size-4" />
                  </div>
                )}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto hover:no-underline hover:opacity-80 transition-opacity"
                onClick={() => navigate("/register")}
                disabled={isLoginPending || isGoogleInitPending}
              >
                Register
              </Button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
