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
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
          color="#C026D3"
          glow="rgba(192,38,211,0.28)"
        />
      </div>

      {!isOwner && hasSession && (
        <Button
          variant={following ? "outline" : "default"}
          onClick={toggle}
          disabled={loading}
          className={`h-11 w-full font-black uppercase tracking-[0.14em] [clip-path:polygon(0_0,calc(100%_-_12px)_0,100%_12px,100%_100%,0_100%)] ${
            following
              ? "border-[color-mix(in_srgb,var(--gr-cyan-glow)_36%,transparent)] bg-[color-mix(in_srgb,var(--gr-cyan-glow)_10%,transparent)] text-[var(--gr-cyan-glow)] hover:border-[color-mix(in_srgb,var(--gr-magenta)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--gr-magenta)_10%,transparent)] hover:text-[var(--gr-magenta)]"
              : "border-[color-mix(in_srgb,var(--gr-magenta)_40%,transparent)] bg-[linear-gradient(135deg,var(--gr-magenta)_0%,var(--gr-cyan-glow)_100%)] text-white shadow-[0_10px_30px_-14px_rgba(192,38,211,0.8)] hover:brightness-110 hover:shadow-[0_0_24px_rgba(34,211,238,0.25),0_0_28px_rgba(192,38,211,0.3)]"
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
  const topLine = `linear-gradient(90deg, ${color}, rgba(255,255,255,0.06))`;

  return (
    <div
      className="group relative overflow-hidden px-3.5 py-3 ring-1 ring-white/[0.07] transition-all duration-200 hover:-translate-y-0.5 hover:ring-white/[0.14]"
      style={{
        background: `linear-gradient(180deg, color-mix(in_srgb, var(--gr-bg-1) 92%, black), color-mix(in_srgb, ${color} 10%, var(--gr-bg-0)))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 38px -28px ${glow}`,
        clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: topLine }} />

      {/* glow orb */}
      <div
        className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-50 blur-xl transition-opacity group-hover:opacity-80"
        style={{ background: glow }}
      />

      <div className="relative">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/42">
          {label}
        </p>

        {/* icon */}
        <div
          className="mb-3 mt-2 inline-flex h-9 w-9 items-center justify-center rounded-[12px] ring-1"
          style={{ background: `${color}15`, color, boxShadow: `0 0 18px -8px ${glow}`, borderColor: `${color}30` }}
        >
          {icon}
        </div>

        {/* value */}
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-display text-[24px] font-extrabold leading-none tabular-nums text-[var(--gr-text-hi)]"
          >
            {value}
          </span>
          {sub && (
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
              {sub}
            </span>
          )}
        </div>

        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
          pulse
        </p>
      </div>
    </div>
  );
}
