"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, ArrowUp, ArrowDown, Crown, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  kickClanMemberAction,
  changeMemberRoleAction,
  transferLeadershipAction,
} from "./manage-actions";

type ViewerRole = "leader" | "officer" | "member" | "none";

// Per-member leadership controls, shown on the clan detail page. What renders
// depends on the viewer's role and the target's role (mirrors the server-side
// permission checks — the actions re-verify, this is just UI gating).
export function ClanMemberActions({
  memberId,
  memberRole,
  clanSlug,
  viewerRole,
  isSelf,
}: {
  memberId: string;
  memberRole: string;
  clanSlug: string;
  viewerRole: ViewerRole;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isSelf || memberRole === "leader") return null;

  const isLeader = viewerRole === "leader";
  const isOfficer = viewerRole === "officer";
  // Officers may only kick plain members; leaders may act on anyone below them.
  const canKick = isLeader || (isOfficer && memberRole === "member");
  const canPromote = isLeader && memberRole === "member";
  const canDemote = isLeader && memberRole === "officer";
  const canTransfer = isLeader;

  if (!canKick && !canPromote && !canDemote && !canTransfer) return null;

  const run = (fn: () => Promise<{ success: boolean; message?: string }>) => {
    setOpen(false);
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-label="მართვა"
        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition-colors hover:border-[var(--gr-violet-hi)]/40 hover:text-white disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </button>

      {open && (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-[var(--gr-border-hi)] bg-[var(--gr-bg-elev-1)] p-1 shadow-2xl">
            {canPromote && (
              <MenuItem icon={ArrowUp} label="ოფიცრად დაწინაურება" onClick={() => run(() => changeMemberRoleAction(memberId, "officer", clanSlug))} />
            )}
            {canDemote && (
              <MenuItem icon={ArrowDown} label="წევრად ჩამოქვეითება" onClick={() => run(() => changeMemberRoleAction(memberId, "member", clanSlug))} />
            )}
            {canTransfer && (
              <MenuItem icon={Crown} label="ლიდერობის გადაცემა" onClick={() => run(() => transferLeadershipAction(memberId, clanSlug))} />
            )}
            {canKick && (
              <MenuItem icon={UserMinus} label="კლანიდან გაგდება" danger onClick={() => run(() => kickClanMemberAction(memberId, clanSlug))} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-bold transition-colors ${
        danger
          ? "text-red-300 hover:bg-red-500/10"
          : "text-white/80 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
