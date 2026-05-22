"use client";

import { useState } from "react";
import {
  Sparkles,
  Flame,
  Users as UsersIcon,
  Trophy,
  UserPlus,
  UserCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  username: string;
  isOwner: boolean;
  hasSession: boolean;
  initialFollowing: boolean;
  initialFollowerCount: number;
  level: number;
  xp: number;
  streak: number;
};

export function ProfileSummaryRight({
  username,
  isOwner,
  hasSession,
  initialFollowing,
  initialFollowerCount,
  level,
  xp,
  streak,
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
    <div className="w-full space-y-3">
      <div
        className="relative space-y-0.5 bg-[var(--gr-bg-1)] p-3 ring-1 ring-[var(--gr-border)]"
        style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)" }}
      >
        <StatRow
          icon={<Sparkles className="h-4 w-4 text-[var(--gr-violet-hi)]" />}
          label={`Level ${level}`}
          value={`${xp} XP`}
        />
        <StatRow
          icon={<Flame className="h-4 w-4 text-[var(--gr-amber)]" />}
          label="Streak"
          value={`${streak} დღე`}
        />
        <StatRow
          icon={<UsersIcon className="h-4 w-4 text-[var(--gr-cyan-glow)]" />}
          label="გამომწერი"
          value={String(followerCount)}
        />
        <StatRow
          icon={<Trophy className="h-4 w-4 text-[var(--gr-magenta)]" />}
          label="ტიტული"
          value="0"
        />
      </div>

      {!isOwner && hasSession && (
        <Button
          variant={following ? "outline" : "default"}
          onClick={toggle}
          disabled={loading}
          className={`w-full ${
            following
              ? "border-primary/40 text-primary hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              : ""
          }`}
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
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 text-[12.5px] text-[var(--gr-text-mute)]">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-[13px] font-bold tabular-nums text-[var(--gr-text)]">{value}</span>
    </div>
  );
}
