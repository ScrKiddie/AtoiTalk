import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useDeleteAccount } from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ApiError } from "@/types";
import { AxiosError } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  hasPassword?: boolean;
  onSuccess: () => void;
}

const errorVariants = {
  hidden: { opacity: 0, y: -5, height: 0, marginTop: 0 },
  visible: { opacity: 1, y: 0, height: "auto", marginTop: 12 },
  exit: { opacity: 0, y: -5, height: 0, marginTop: 0 },
};

export function DeleteAccountDialog({
  isOpen,
  onClose,
  hasPassword = false,
  onSuccess,
}: DeleteAccountDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  const { mutate: deleteAccount, isPending } = useDeleteAccount();

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setConfirmText("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (hasPassword && !password) {
      setError("Password is required.");
      return;
    }

    deleteAccount(
      { password: hasPassword ? password : undefined },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (err) => {
          const axiosError = err as AxiosError<ApiError>;
          const status = axiosError.response?.status;

          if (status === 403) {
            setError(
              "You cannot delete your account because you are the owner of one or more groups. Please transfer ownership or delete the groups first."
            );
          } else {
            setError("");
            toast.error(axiosError.response?.data?.error || "Failed to delete account.", {
              id: "delete-account-error",
            });
          }
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isPending && onClose(val)}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => isPending && e.preventDefault()}
        onEscapeKeyDown={(e) => isPending && e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>Delete Account</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            This action cannot be undone. This will permanently delete your account and remove your
            data from our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="delete-password">Confirm Password</Label>
              <PasswordInput
                id="delete-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                disabled={isPending}
                placeholder="Enter your password"
                className={cn(error && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
          )}

          {!hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="confirm-text" className="text-muted-foreground">
                Type <span className="font-bold text-foreground">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setError("");
                }}
                disabled={isPending}
                placeholder="DELETE"
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                variants={errorVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="text-[0.85rem] font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onClose(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={
              isPending || (hasPassword && !password) || (!hasPassword && confirmText !== "DELETE")
            }
            className="relative"
          >
            <span className={isPending ? "opacity-0" : ""}>Delete My Account</span>
            {isPending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
