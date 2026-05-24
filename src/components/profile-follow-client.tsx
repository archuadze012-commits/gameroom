"use client";

import { useState } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Trophy, Users as UsersIcon, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  username: string;
  isOwner: boolean;
  initialFollowing: boolean;
  initialFollowerCount: number;
  lfgCount: number;
  gameCount: number;
  statsOnly?: boolean;
};

export function ProfileFollowClient({
  username,
  isOwner,
  initialFollowing,
  initialFollowerCount,
  lfgCount,
  gameCount,
  statsOnly = false,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowerCount((c) => Math.max(0, c + (wasFollowing ? -1 : 1)));

    try {
      const res = await fetch(`/api/follows/${username}`, {
        method: wasFollowing ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error();
    } catch {
      setFollowing(wasFollowing);
      setFollowerCount((c) => Math.max(0, c + (wasFollowing ? 1 : -1)));
      toast.error("შეცდომა — სცადე თავიდან");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Follow button — hidden for own profile or when statsOnly */}
      {!isOwner && !statsOnly && (
        <Button
          variant={following ? "outline" : "default"}
          onClick={toggle}
          disabled={loading}
          className={following ? "border-primary/40 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40" : ""}
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : following ? (
            <UserCheck className="mr-1.5 h-4 w-4" />
          ) : (
            <UserPlus className="mr-1.5 h-4 w-4" />
          )}
          {following ? "გამოწერილია" : "გამოწერა"}
        </Button>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Stat icon={<UsersIcon className="h-4 w-4" />} value={String(followerCount)} label="გამომწერი" />
        <Stat icon={<Gamepad2 className="h-4 w-4" />} value={String(gameCount)} label="თამაში" />
        <Stat icon={<Trophy className="h-4 w-4" />} value="0" label="ტიტული" />
        <Stat icon={<UsersIcon className="h-4 w-4" />} value={String(lfgCount)} label="ლოკალი დაპოსტილი" />
      </div>
    </>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-3">
      <div className="flex items-center justify-center gap-1 text-primary">{icon}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
