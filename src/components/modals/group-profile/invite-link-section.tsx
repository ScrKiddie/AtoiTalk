import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useResetInviteCode } from "@/hooks/mutations/use-group";
import { toast } from "@/lib/toast";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

interface InviteLinkSectionProps {
  chatId: string;
  inviteCode: string | null | undefined;
  isPublic: boolean;
  isAdminOrOwner: boolean;
  inviteExpiresAt?: string | null;
}

export const InviteLinkSection = ({
  chatId,
  inviteCode,
  isPublic,
  isAdminOrOwner,
  inviteExpiresAt,
}: InviteLinkSectionProps) => {
  const { mutate: resetInvite, isPending: isResetting } = useResetInviteCode();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const isExpired = inviteExpiresAt ? new Date(inviteExpiresAt) < new Date() : false;

  const inviteLink = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : "";

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copied to clipboard");
  };

  const handleReset = () => {
    resetInvite(chatId, {
      onSuccess: () => {
        setIsResetConfirmOpen(false);
      },
    });
  };

  if (!inviteCode) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Invite Link
        </div>
        {!isPublic && inviteExpiresAt && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground/80">
              Expires{" "}
              {new Date(inviteExpiresAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-stretch gap-2 min-w-0">
        <div
          className={`text-sm bg-muted/50 p-2.5 rounded-md border text-foreground flex-1 flex items-center min-w-0 ${isExpired ? "opacity-60" : ""}`}
        >
          <span className={`truncate ${isExpired ? "line-through" : ""}`}>
            {isExpired ? "Invite link has expired" : inviteLink}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-auto w-10 shrink-0 aspect-square"
          onClick={handleCopy}
          disabled={!inviteCode || isExpired}
          title="Copy Link"
        >
          <Copy className="h-4 w-4" />
        </Button>
        {isAdminOrOwner && (
          <Button
            variant="outline"
            size="icon"
            className="h-auto w-10 shrink-0 aspect-square text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            onClick={() => (isExpired ? handleReset() : setIsResetConfirmOpen(true))}
            disabled={isResetting}
            title="Reset Link"
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <ConfirmationDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Reset Invite Link?"
        description="The current invite link will no longer work. Users attempting to join with the old link will be rejected. Are you sure you want to generate a new one?"
        confirmText="Reset Link"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleReset}
        isLoading={isResetting}
      />
    </div>
  );
};
