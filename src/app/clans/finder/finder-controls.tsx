"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radar, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { setLookingForClanAction } from "./actions";
import { inviteToClanAction } from "@/app/clans/[slug]/clan-feature-actions";

export function LfcToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [isPending, start] = useTransition();

  const toggle = () => {
    const next = !on;
    start(async () => {
      const res = await setLookingForClanAction(next);
      if (res.success) {
        setOn(next);
        toast.success(res.message ?? "განახლდა");
        router.refresh();
      } else {
        toast.error(res.message ?? "ვერ მოხერხდა");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 ${
        on
          ? "border-[var(--gr-lime)]/40 bg-[var(--gr-lime)]/[0.12] text-[var(--gr-lime)]"
          : "border-white/12 bg-white/[0.03] text-white/70 hover:text-white"
      }`}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? <Check className="h-4 w-4" /> : <Radar className="h-4 w-4" />}
      {on ? "ვეძებ კლანს — ჩართულია" : "მე ვეძებ კლანს"}
    </button>
  );
}

export function InvitePlayerButton({ clanSlug, username }: { clanSlug: string; username: string }) {
  const [done, setDone] = useState(false);
  const [isPending, start] = useTransition();

  const invite = () => {
    start(async () => {
      const res = await inviteToClanAction(clanSlug, username);
      if (res.success) {
        setDone(true);
        toast.success(res.message ?? "მოწვეულია");
      } else {
        toast.error(res.message ?? "ვერ მოხერხდა");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={invite}
      disabled={isPending || done}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--gr-violet-hi)]/40 bg-[var(--gr-violet)]/10 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-[var(--gr-violet-hi)] transition-colors hover:bg-[var(--gr-violet)]/20 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {done ? "მოწვეული" : "მოწვევა"}
    </button>
  );
}
