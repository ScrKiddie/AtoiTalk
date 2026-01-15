import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/lib/toast";
import { formatLastSeen } from "@/lib/utils";
import { User } from "@/types";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface PartnerProfileDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  user: User | null;
  isLoading: boolean;
}

export function PartnerProfileDialog({
  isOpen,
  onClose,
  user,
  isLoading,
}: PartnerProfileDialogProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsAvatarLoaded(false);
  }, [isOpen]);

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <>
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] bg-black/50 animate-in fade-in-0"
            aria-hidden="true"
          />,
          document.body
        )}

      <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
        <DialogContent
          className="sm:max-w-[425px] z-[61]"
          onInteractOutside={(e) => isLightboxOpen && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">User Profile</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner className="size-8" />
            </div>
          ) : user ? (
            <div className="grid gap-6 py-4">
              <div className="flex flex-col items-center gap-1 mb-2 w-full px-4 overflow-hidden">
                <Avatar
                  className={`h-24 w-24 ${user.avatar && isAvatarLoaded ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                  onClick={() => user.avatar && isAvatarLoaded && setIsLightboxOpen(true)}
                >
                  <AvatarImage
                    src={user.avatar || undefined}
                    className="object-cover"
                    onLoadingStatusChange={(status) => setIsAvatarLoaded(status === "loaded")}
                  />
                  <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
                </Avatar>

                <h3 className="font-semibold text-xl truncate w-full text-center">
                  {user.full_name}
                </h3>

                <div className="flex items-center gap-2">
                  {user.is_blocked_by_me || user.is_blocked_by_other ? (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Last seen a long time ago
                    </span>
                  ) : user.is_online ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Online
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {user.last_seen_at ? formatLastSeen(user.last_seen_at) : "Offline"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Username
                  </div>
                  <div className="flex items-stretch gap-2 min-w-0">
                    <div className="text-sm bg-muted/50 p-2.5 rounded-md border text-foreground flex-1 flex items-center min-w-0">
                      <span className="truncate">@{user.username}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-auto w-10 shrink-0 aspect-square"
                      onClick={() => {
                        navigator.clipboard.writeText(user.username);
                        toast.success("Username copied to clipboard", {
                          id: "copy-username-success",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy Username</span>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bio
                  </div>
                  <div className="text-sm bg-muted/50 p-2.5 rounded-md border text-foreground max-h-[120px] overflow-y-auto whitespace-pre-wrap break-words">
                    {user.bio || (
                      <span className="text-muted-foreground/60 italic">No bio available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">User not found.</div>
          )}
        </DialogContent>
      </Dialog>

      <Lightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        slides={user?.avatar ? [{ src: user.avatar }] : []}
        plugins={[Zoom]}
        controller={{ closeOnBackdropClick: true }}
        zoom={{ scrollToZoom: true }}
        carousel={{ finite: true }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
        styles={{
          root: { zIndex: 2147483647 },
          container: { backgroundColor: "#000", zIndex: 2147483647 },
        }}
      />
    </>
  );
}
