import type { LobbyHudData } from "@/types/lobby";
import { LobbyCurrencyStrip } from "@/components/lobby/lobby-currency-strip";
import { LobbyPlayerCard } from "@/components/lobby/lobby-player-card";
import { LobbyRpBar } from "@/components/lobby/lobby-rp-bar";

type LobbyHudProps = {
  data: LobbyHudData | null;
};

export function LobbyHud({ data }: LobbyHudProps) {
  if (!data) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 max-[640px]:px-2 max-[640px]:pt-2">
      <div className="grid grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)] items-start gap-3 max-[640px]:grid-cols-1 max-[640px]:gap-2">
        <div className="justify-self-start max-[640px]:w-full">
          <LobbyPlayerCard player={data.player} />
        </div>
        <div className="justify-self-center max-[640px]:w-full">
          <LobbyRpBar royalePass={data.royalePass} />
        </div>
        <div className="justify-self-end max-[640px]:w-full">
          <LobbyCurrencyStrip currencies={data.currencies} />
        </div>
      </div>
    </div>
  );
}
