"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Crown, UserMinus, Loader2, ShieldPlus, UserCog, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { clanRoleRank, isClanManager, type AssignableClanRole } from "@/lib/clan/roles";
import {
  kickClanMemberAction,
  changeMemberRoleAction,
  transferLeadershipAction,
} from "./manage-actions";

const ROLE_ACTION_LABEL: Record<AssignableClanRole, string> = {
  co_leader: "Co-ლიდერად",
  manager: "მენეჯერად",
  member: "წევრად ჩამოქვეითება",
};

// Per-member leadership controls, shown on the roster. What renders depends on the
// viewer's role and the target's rank (mirrors the server-side permission checks —
// the actions re-verify, this is just UI gating).
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
  viewerRole: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isSelf || memberRole === "leader") return null;

  const isLeader = viewerRole === "leader";
  // A manager may kick anyone strictly below them in rank.
  const canKick = isClanManager(viewerRole) && clanRoleRank(viewerRole) < clanRoleRank(memberRole);
  const canTransfer = isLeader;
  // Only the leader assigns roles; offer every role the target isn't already.
  const roleOptions: AssignableClanRole[] = isLeader
    ? (["co_leader", "manager", "member"] as const).filter((r) => r !== memberRole)
    : [];

  if (!canKick && !canTransfer && roleOptions.length === 0) return null;

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
          <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-xl border border-[var(--gr-border-hi)] bg-[var(--gr-bg-elev-1)] p-1 shadow-2xl">
            {roleOptions.map((r) => (
              <MenuItem
                key={r}
                icon={r === "member" ? ArrowDown : r === "co_leader" ? ShieldPlus : UserCog}
                label={ROLE_ACTION_LABEL[r]}
                onClick={() => run(() => changeMemberRoleAction(memberId, r, clanSlug))}
              />
            ))}
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
        danger ? "text-red-300 hover:bg-red-500/10" : "text-white/80 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
