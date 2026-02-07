import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useDeleteAccount } from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { ApiError } from "@/types";
import { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  hasPassword?: boolean;
  onSuccess: () => void;
}

export function DeleteAccountDialog({
  isOpen,
  onClose,
  hasPassword = false,
  onSuccess,
}: DeleteAccountDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const { mutate: deleteAccount, isPending } = useDeleteAccount();

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setConfirmText("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (hasPassword && !password) {
      toast.error("Password is required.");
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
            toast.error(
              "You cannot delete your account because you are the owner of one or more groups. Please transfer ownership or delete the groups first."
            );
          } else {
            toast.error(axiosError.response?.data?.error || "Failed to delete account.");
          }
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isPending && onClose(val)}>
      <DialogContent
        size="default"
        onInteractOutside={(e) => isPending && e.preventDefault()}
        onEscapeKeyDown={(e) => isPending && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
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
                }}
                disabled={isPending}
                placeholder="Enter your password"
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
                }}
                disabled={isPending}
                placeholder="DELETE"
              />
            </div>
          )}
        </div>

        <DialogFooter>
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
            <span className={isPending ? "opacity-0" : ""}>Delete Account</span>
            {isPending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
