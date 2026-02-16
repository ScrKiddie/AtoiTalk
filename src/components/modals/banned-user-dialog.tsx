import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
    <ConfirmationDialog
      open={isOpen}
      onOpenChange={() => {}}
      title="Account Banned"
      description="Your account has been banned by an administrator."
      confirmText="Log Out"
      onConfirm={handleLogout}
      variant="destructive"
      showCancel={false}
      modal={true}
    >
      {reason && (
        <div className="pt-2">
          <span className="block font-medium text-destructive">Reason: {reason}</span>
        </div>
      )}
    </ConfirmationDialog>
  );
}
