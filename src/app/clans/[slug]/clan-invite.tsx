"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { inviteToClanAction, respondClanInviteAction } from "./clan-feature-actions";

// Leader/officer control: invite a player by username.
export function ClanInviteBox({ slug }: { slug: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isPending, startTransition] = useTransition();

  const invite = () => {
    const u = username.trim().replace(/^@/, "");
    if (!u) return;
    startTransition(async () => {
      const res = await inviteToClanAction(slug, u);
      if (res.success) {
        toast.success(res.message);
        setUsername("");
        router.refresh();
      } else toast.error(res.message);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && invite()}
          placeholder="username"
          disabled={isPending}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-7 pr-3 text-[13px] text-white outline-none focus:border-[var(--gr-violet-hi)]/50 disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={invite}
        disabled={isPending || !username.trim()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--gr-violet-hi)] px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-white transition-all hover:brightness-110 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
        მოწვევა
      </button>
    </div>
  );
}

// Shown to a user who has a pending invite to this clan.
export function ClanInviteResponse({ inviteId, clanName }: { inviteId: string; clanName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const respond = (accept: boolean) => {
    startTransition(async () => {
      const res = await respondClanInviteAction(inviteId, accept);
      if (res.success) {
        toast.success(res.message);
        setDone(true);
        router.refresh();
      } else toast.error(res.message);
    });
  };

  if (done) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--gr-violet-hi)]/30 bg-[var(--gr-violet)]/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] font-bold text-white">
        <span className="text-[var(--gr-violet-hi)]">{clanName}</span>-მა მოგიწვია კლანში 🛡️
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => respond(true)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--gr-lime)] px-4 py-2 text-[12px] font-black uppercase tracking-wider text-[#0a1f00] transition-all hover:brightness-110 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} მიღება
        </button>
        <button
          type="button"
          onClick={() => respond(false)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-black uppercase tracking-wider text-white/60 transition-colors hover:text-white disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" /> უარი
        </button>
      </div>
    </div>
  );
}
