"use client";

import { useState } from "react";
import {
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
};

export function ProfileSummaryRight({
  username,
  isOwner,
  hasSession,
  initialFollowing,
  initialFollowerCount,
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
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="გამომწერი"
          value={String(followerCount)}
          color="#22D3EE"
          glow="rgba(34,211,238,0.3)"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="ტიტული"
          value="0"
          color="#C084FC"
          glow="rgba(192,132,252,0.3)"
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

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  glow: string;
}) {
  return (
    <div
      className="group relative overflow-hidden p-3 ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12]"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, ${color}03 100%)`,
        clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
      }}
    >
      {/* glow orb */}
      <div
        className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-50 blur-xl transition-opacity group-hover:opacity-80"
        style={{ background: glow }}
      />

      <div className="relative">
        {/* icon */}
        <div
          className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>

        {/* value */}
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-display text-[22px] font-extrabold leading-none tabular-nums"
            style={{ color }}
          >
            {value}
          </span>
          {sub && (
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
              {sub}
            </span>
          )}
        </div>

        {/* label */}
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
          {label}
        </p>
      </div>
    </div>
  );
}
