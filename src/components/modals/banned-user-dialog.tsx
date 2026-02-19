import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLogout } from "@/hooks/queries";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function BannedUserDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const logout = useLogout();
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
      <DialogContent
        className="sm:w-[400px] text-center [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl text-center">Account Banned</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Your account has been banned by an administrator.
            </DialogDescription>
          </DialogHeader>

          {reason && (
            <div className="w-full rounded-md bg-muted/50 p-3 border border-border/50">
              <span className="text-sm font-medium block mb-1 text-muted-foreground">Reason:</span>
              <p className="text-sm">{reason}</p>
            </div>
          )}

          <div className="w-full pt-2">
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              Log Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
