import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function BannedUserDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const handleBanned = (event: CustomEvent<{ reason?: string }>) => {
      setReason(event.detail.reason || null);
      setIsOpen(true);
    };

    const handleUnbanned = () => {
      setIsOpen(false);
      setReason(null);
    };

    window.addEventListener("user-banned", handleBanned as EventListener);
    window.addEventListener("user-unbanned", handleUnbanned as EventListener);
    return () => {
      window.removeEventListener("user-banned", handleBanned as EventListener);
      window.removeEventListener("user-unbanned", handleUnbanned as EventListener);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account Banned</AlertDialogTitle>
          <AlertDialogDescription>
            Your account has been banned by an administrator.
            {reason && (
              <span className="block mt-2 font-medium text-destructive">Reason: {reason}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleLogout}
            className="bg-destructive hover:bg-destructive/90"
          >
            Log Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
