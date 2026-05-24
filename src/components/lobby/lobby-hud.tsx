import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { LobbyHudData } from "@/types/lobby";
import { LobbyCurrencyStrip } from "@/components/lobby/lobby-currency-strip";
import { LobbyPlayerCard } from "@/components/lobby/lobby-player-card";

type LobbyHudProps = {
  data: LobbyHudData | null;
};

export function LobbyHud({ data }: LobbyHudProps) {
  if (!data) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 max-[640px]:px-2 max-[640px]:pt-2">
      <div className="grid grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)] items-start gap-3 max-[640px]:grid-cols-1 max-[640px]:gap-2">
        <div className="justify-self-start max-[640px]:w-full">
          <LobbyPlayerCard player={data.player} />
        </div>
        <div className="flex flex-col items-end gap-2 justify-self-end max-[640px]:items-start max-[640px]:justify-self-start max-[640px]:w-full">
          <LobbyCurrencyStrip currencies={data.currencies} />
          <Link
            href="/shop"
            className="pointer-events-auto inline-flex h-8 items-center gap-1.5 bg-[color-mix(in_srgb,var(--gr-bg-0)_72%,transparent)] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-amber)] shadow-[var(--gr-card-shadow)] ring-1 ring-[color-mix(in_srgb,var(--gr-amber)_42%,transparent)] backdrop-blur-md transition hover:bg-[color-mix(in_srgb,var(--gr-amber)_14%,transparent)] hover:text-white [clip-path:polygon(0_0,calc(100%_-_9px)_0,100%_9px,100%_100%,0_100%)]"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            შოპი
          </Link>
        </div>
      </div>
    </div>
  );
}
