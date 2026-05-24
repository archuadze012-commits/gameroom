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
        <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-black text-[#C8D4DC] animate-bounce">
          {flash}
        </span>
      )}
      <button
        type="button"
        onClick={handleClaim}
        disabled={claimed || isPending}
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-[var(--gr-card-shadow)] ring-1 backdrop-blur-md transition [clip-path:polygon(0_0,calc(100%_-_8px)_0,100%_8px,100%_100%,0_100%)] ${
          claimed
            ? "cursor-default bg-[color-mix(in_srgb,var(--gr-bg-0)_72%,transparent)] text-[var(--gr-text-dim)] ring-[var(--gr-border)]"
            : "bg-[color-mix(in_srgb,var(--gr-bg-0)_72%,transparent)] text-[#C8D4DC] ring-[color-mix(in_srgb,#C8D4DC_35%,transparent)] hover:bg-[color-mix(in_srgb,#C8D4DC_12%,transparent)] hover:text-white"
        }`}
      >
        <Gift className="h-3.5 w-3.5 shrink-0" />
        {claimed ? "მიღებულია" : "დღიური ბონუსი"}
      </button>
    </div>
  );
}
