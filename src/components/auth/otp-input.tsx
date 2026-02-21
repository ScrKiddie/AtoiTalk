import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AnimatePresence, motion } from "motion/react";
import { Control, FieldValues, Path } from "react-hook-form";

interface OtpInputProps<T extends FieldValues> {
  control: Control<T>;
  isSendingOTP: boolean;
  isCaptchaSolving: boolean;
  captchaToken: string | null;
  onResend: () => void;
}

const errorVariants = {
  hidden: { opacity: 0, y: -5, height: 0, marginTop: 0 },
  visible: { opacity: 1, y: 0, height: "auto", marginTop: 12 },
  exit: { opacity: 0, y: -5, height: 0, marginTop: 0 },
};

export const OtpInput = <T extends FieldValues>({
  control,
  isSendingOTP,
  isCaptchaSolving,
  captchaToken,
  onResend,
}: OtpInputProps<T>) => {
  return (
    <>
      <FormField
        control={control}
        name={"email" as Path<T>}
        render={({ field, fieldState }) => (
          <FormItem className="space-y-0">
            <FormLabel>Email</FormLabel>
            <FormControl className="mt-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Email"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.replace(/\s/g, ""))}
                  className={
                    fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""
                  }
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
        control={control}
        name={"code" as Path<T>}
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
    </>
  );
};
