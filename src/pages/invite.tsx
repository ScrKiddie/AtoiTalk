import Logo from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/avatar-utils";
import { toast } from "@/lib/toast";
import { chatService } from "@/services";
import { useAuthStore } from "@/store";
import { ChatListItem } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [group, setGroup] = useState<ChatListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("Invalid invite link");
      setIsLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        const data = await chatService.getGroupPreview(code);
        setGroup(data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } } };
        console.error("Failed to fetch group preview:", err);
        setError(error.response?.data?.error || "This invite link is invalid or has expired.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [code]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/invite/${code}`);
      return;
    }

    if (!code) return;

    setIsJoining(true);
    try {
      const data = await chatService.joinGroupByInvite(code);
      await queryClient.invalidateQueries({ queryKey: ["chats"] });

      toast.success(`Successfully joined ${data.name}`);
      navigate(`/chat/${data.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error("Failed to join group:", err);
      toast.error(error.response?.data?.error || "Failed to join group");

      if (error.response?.data?.error?.includes("already a member")) {
        if (group?.id) navigate(`/chat/${group.id}`);
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading invite info...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md bg-card border rounded-xl p-8 shadow-sm flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Invite Error</h1>
          <p className="text-muted-foreground mb-6">{error || "Group not found"}</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = getInitials(group.name);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-0 bg-background gap-6">
      <div className="flex justify-center items-center ">
        <Logo width={32} height={40} />
        <span className="text-4xl font-semibold tracking-tight">AtoiTalk</span>
      </div>

      <div className="w-full sm:w-auto relative z-10">
        <div className="w-full border-0 shadow-none rounded-none bg-transparent sm:w-[400px] sm:border sm:shadow-sm sm:rounded-xl sm:bg-card mx-auto">
          <div className="p-0 sm:p-6 pb-2">
            <div className="flex flex-col space-y-1.5 p-6 pb-2 pt-0 sm:p-0">
              <h3 className="text-xl font-semibold leading-none tracking-tight text-center">
                Join Group
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                You've been invited to join a group chat
              </p>
            </div>
          </div>

          <div className="p-6 pt-2 sm:pt-4">
            <div className="flex flex-col items-center mb-6 space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                  <AvatarImage src={group.avatar || undefined} className="object-cover" />
                  <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center w-full px-2 space-y-1">
                <h2 className="text-xl font-bold truncate max-w-full" title={group.name}>
                  {group.name}
                </h2>
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm">
                  <Users className="h-3.5 w-3.5" />
                  <span>{group.member_count || 1} members</span>
                </div>
              </div>

              {group.description && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md w-full text-center line-clamp-3">
                  {group.description}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button className="w-full h-10 font-medium" onClick={handleJoin} disabled={isJoining}>
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Group"
                )}
              </Button>

              {!isAuthenticated && (
                <p className="text-xs text-center text-muted-foreground">
                  You'll need to sign in to join.
                </p>
              )}

              {isAuthenticated && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/">Cancel</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 text-xs text-muted-foreground/60 text-center w-full z-0">
        Secured by AtoiTalk
      </div>
    </div>
  );
}
