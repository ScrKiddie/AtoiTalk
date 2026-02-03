import { BlockUserDialog } from "@/components/modals/block-user-dialog";
import { ReportDialog } from "@/components/modals/report-dialog";
import { UnblockUserDialog } from "@/components/modals/unblock-user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlobalLightbox } from "@/components/ui/lightbox";
import { LoadingModal } from "@/components/ui/loading-modal";
import { Spinner } from "@/components/ui/spinner";
import { useChats, useCreatePrivateChat, useUserById } from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { formatLastSeen } from "@/lib/utils";
import { useAuthStore, useUIStore } from "@/store";
import { Ban, Copy, Flag, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function UserProfileDialog() {
  const { isOpen, userId, config } = useUIStore((state) => state.profileModal);
  const closeProfileModal = useUIStore((state) => state.closeProfileModal);

  const { data: user, isLoading, isError } = useUserById(userId, { enabled: isOpen && !!userId });

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const { mutate: createPrivateChat, isPending: isCreatingChat } = useCreatePrivateChat();
  const { data: chatsData } = useChats(undefined, { enabled: isOpen });

  const handleBlockUser = () => {
    setIsBlockConfirmOpen(true);
  };

  useEffect(() => {
    if (!isOpen) setIsAvatarLoaded(false);
  }, [isOpen]);

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load user profile");
      closeProfileModal();
    }
  }, [isError, closeProfileModal]);

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const handleSendMessage = () => {
    if (!user) return;

    const existingChat = chatsData?.pages
      .flatMap((page) => page.data)
      .find((chat) => chat.type === "private" && chat.other_user_id === user.id);

    if (existingChat) {
      closeProfileModal();
      navigate(`/chat/${existingChat.id}`);
      return;
    }

    createPrivateChat(
      { target_user_id: user.id },
      {
        onSuccess: (chat) => {
          closeProfileModal();
          navigate(`/chat/${chat.id}`);
        },
        onError: () => toast.error("Failed to start chat"),
      }
    );
  };

  const showDirectMessageButton = !config?.hideMessageButton;
  const isDirectMessageDisabled = false;

  return (
    <>
      <LoadingModal isOpen={isLoading && isOpen} className="z-[100]" overlayClassName="z-[100]" />

      <Dialog
        open={isOpen && !!user && !isLoading}
        onOpenChange={(open) => !open && closeProfileModal()}
        modal={true}
      >
        <DialogContent
          className="max-w-[85%] sm:max-w-[380px] z-[71]"
          overlayClassName="z-[70]"
          onInteractOutside={(e) => (isLightboxOpen || isBlockConfirmOpen) && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">User Profile</DialogTitle>
          </DialogHeader>

          {user ? (
            <div className="grid gap-6 pt-4">
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

              {currentUser?.id !== user.id && (
                <div
                  className={`grid gap-4 w-full px-4 mb-2 ${showDirectMessageButton && !isDirectMessageDisabled ? "grid-cols-3" : "grid-cols-2"}`}
                >
                  {showDirectMessageButton && !isDirectMessageDisabled && (
                    <Button
                      variant="outline"
                      className="flex-1 flex flex-col gap-1 h-auto py-3"
                      onClick={handleSendMessage}
                      disabled={isCreatingChat || user.is_blocked_by_me || user.is_blocked_by_other}
                    >
                      {isCreatingChat ? (
                        <Spinner className="size-5" />
                      ) : (
                        <MessageCircle className="size-5" />
                      )}
                      <span className="text-xs font-medium">Message</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="flex-1 flex flex-col gap-1 h-auto py-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    onClick={() => setIsReportOpen(true)}
                  >
                    <Flag className="size-5" />
                    <span className="text-xs font-medium">Report</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1 flex flex-col gap-1 h-auto py-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    onClick={handleBlockUser}
                  >
                    <motion.div
                      key={user.is_blocked_by_me ? "unblock" : "block"}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center gap-1"
                    >
                      {user.is_blocked_by_me ? (
                        <>
                          <Ban className="size-5" />
                          <span className="text-xs font-medium">Unblock</span>
                        </>
                      ) : (
                        <>
                          <Ban className="size-5" />
                          <span className="text-xs font-medium">Block</span>
                        </>
                      )}
                    </motion.div>
                  </Button>
                </div>
              )}

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

      <GlobalLightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        slides={user?.avatar ? [{ src: user.avatar, alt: user.full_name }] : []}
      />

      {user && (
        <>
          <ReportDialog
            isOpen={isReportOpen}
            onClose={setIsReportOpen}
            targetType="user"
            targetId={user.id}
            targetName={user.full_name}
          />

          {user.is_blocked_by_me ? (
            <UnblockUserDialog
              userId={user.id}
              open={isBlockConfirmOpen}
              onOpenChange={setIsBlockConfirmOpen}
              className="z-[76]"
              overlayClassName="z-[75]"
              modal={true}
            />
          ) : (
            <BlockUserDialog
              userId={user.id}
              open={isBlockConfirmOpen}
              onOpenChange={setIsBlockConfirmOpen}
              className="z-[76]"
              overlayClassName="z-[75]"
              modal={true}
            />
          )}
        </>
      )}
    </>
  );
}
