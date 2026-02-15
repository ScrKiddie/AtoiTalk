import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/avatar-utils";
import { type AdminUserDetailResponse } from "@/services/admin.service";
import { format, formatDistanceToNow } from "date-fns";

export function UserDetailContent({ user }: { user: AdminUserDetailResponse }) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatar || undefined} alt={user.full_name} />
          <AvatarFallback className="text-lg">{getInitials(user.full_name)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-lg">{user.full_name}</h3>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant={user.role === "admin" ? "default" : "outline"} className="capitalize">
              {user.role}
            </Badge>
            {user.is_banned && <Badge variant="destructive">Banned</Badge>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user.bio || "No bio available."}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{user.total_messages?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{user.total_groups?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between py-1.5 border-b">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{user.email}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b">
          <span className="text-muted-foreground">Joined</span>
          <span className="font-medium">
            {user.created_at ? format(new Date(user.created_at), "PPP") : "—"}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b">
          <span className="text-muted-foreground">Last seen</span>
          <span className="font-medium">
            {user.last_seen_at
              ? formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true })
              : "—"}
          </span>
        </div>
        {user.is_banned && (
          <>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Ban reason</span>
              <span className="font-medium text-destructive">{user.ban_reason || "—"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Banned until</span>
              <span className="font-medium text-destructive">
                {user.banned_until ? format(new Date(user.banned_until), "PPP p") : "Permanent"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
