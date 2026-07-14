"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { leaveClanAction, disbandClanAction } from "./manage-actions";

// Self-service membership control on the clan detail page: a member leaves, a
// leader disbands. Both are destructive → require an inline confirm click.
export function ClanLeaveButton({
  clanSlug,
  isLeader,
  gameSlug,
}: {
  clanSlug: string;
  isLeader: boolean;
  gameSlug: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const act = () => {
    startTransition(async () => {
      const res = isLeader ? await disbandClanAction(clanSlug) : await leaveClanAction(clanSlug);
      if (res.success) {
        toast.success(res.message);
        router.push(gameSlug ? `/games/${gameSlug}/clans` : "/games");
        router.refresh();
      } else {
        toast.error(res.message);
        setConfirming(false);
      }
    });
  };

  const label = isLeader ? "კლანის დაშლა" : "კლანიდან გასვლა";
  const Icon = isLeader ? Trash2 : LogOut;

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-red-300/90 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
      >
        <Icon className="h-4 w-4" /> {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={act}
        disabled={isPending}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-500/15 px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-red-200 transition-colors hover:bg-red-500/25 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        დაადასტურე
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-white/60 transition-colors hover:text-white"
      >
        არა
      </button>
    </div>
  );
}
