"use client";

import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { claimDailyBonus } from "@/lib/wallet/actions";
import { useRouter } from "next/navigation";

export function LobbyDailyBonus({ available }: { available: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(!available);
  const [flash, setFlash] = useState<string | null>(null);

  function handleClaim() {
    if (claimed || isPending) return;
    startTransition(async () => {
      const result = await claimDailyBonus();
      if (result.success) {
        setClaimed(true);
        setFlash(`+${result.amount} NC`);
        setTimeout(() => setFlash(null), 2500);
        router.refresh();
      } else if (result.error === "already_claimed") {
        setClaimed(true);
      }
    });
  }

  return (
    <div className="relative">
      {flash && (
        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)] animate-bounce">
          {flash}
        </span>
      )}
      <button
        type="button"
        onClick={handleClaim}
        disabled={claimed || isPending}
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.12em] shadow-[0_5px_15px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all ${
          claimed
            ? "cursor-default border-white/5 bg-black/40 text-white/40"
            : "border-violet-500/30 bg-[linear-gradient(90deg,rgba(99,102,241,0.2),rgba(236,72,153,0.2))] text-pink-300 hover:border-violet-500/60 hover:bg-[linear-gradient(90deg,rgba(99,102,241,0.3),rgba(236,72,153,0.3))] hover:text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]"
        }`}
      >
        <Gift className="h-3.5 w-3.5 shrink-0" />
        {claimed ? "მიღებულია" : "დღიური ბონუსი"}
      </button>
    </div>
  );
}
