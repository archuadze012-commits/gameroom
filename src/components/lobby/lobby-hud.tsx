import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { LobbyHudData } from "@/types/lobby";
import { LobbyCurrencyStrip } from "@/components/lobby/lobby-currency-strip";
import { LobbyPlayerCard } from "@/components/lobby/lobby-player-card";
import { LobbyDailyBonus } from "@/components/lobby/lobby-daily-bonus";
import { LOBBY_UI_SCALE, lobbyX, lobbyY } from "@/components/lobby/lobby-coordinate-system";

type LobbyHudProps = {
  data: LobbyHudData | null;
  hideRightHud?: boolean;
};

const PLAYER_CARD_REFERENCE_WIDTH = 176;
const PLAYER_CARD_REFERENCE_HEIGHT = 48;
const START_WIDGET_REFERENCE_WIDTH = 143;
const PLAYER_CARD_SCALE = (START_WIDGET_REFERENCE_WIDTH * LOBBY_UI_SCALE) / PLAYER_CARD_REFERENCE_WIDTH;
const RIGHT_HUD_SCALE = LOBBY_UI_SCALE * 0.82;
const PLAYER_CARD_BASE_LEFT = lobbyX(10.35);
const PLAYER_CARD_BASE_TOP = lobbyY(10.35);

export function LobbyHud({ data, hideRightHud = false }: LobbyHudProps) {
  if (!data) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        className="absolute"
        style={{
          left: `${PLAYER_CARD_BASE_LEFT}px`,
          top: `${PLAYER_CARD_BASE_TOP}px`,
          width: `${PLAYER_CARD_REFERENCE_WIDTH}px`,
          height: `${PLAYER_CARD_REFERENCE_HEIGHT}px`,
          transform: `scale(${PLAYER_CARD_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        <div
          style={{
            width: `${PLAYER_CARD_REFERENCE_WIDTH}px`,
          }}
        >
          <LobbyPlayerCard player={data.player} />
        </div>
      </div>
      <div
        className={`absolute flex flex-col items-end gap-3 transition-opacity duration-300 ${hideRightHud ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={{
          right: `${lobbyX(10.35)}px`,
          top: `${PLAYER_CARD_BASE_TOP}px`,
          transform: `scale(${RIGHT_HUD_SCALE})`,
          transformOrigin: "top right",
        }}
      >
        <div className="flex flex-col items-end gap-3">
          {data.currencies && <LobbyCurrencyStrip currencies={data.currencies} />}
          <div className="flex items-center gap-3">
            <LobbyDailyBonus available={data.dailyBonusAvailable} />
            <Link
              href={`/shop/${data.gameSlug}`}
              className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-full border border-cyan-500/30 bg-[linear-gradient(90deg,rgba(34,211,238,0.1),rgba(99,102,241,0.1))] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-400 shadow-[0_5px_15px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all hover:border-cyan-500/60 hover:bg-[linear-gradient(90deg,rgba(34,211,238,0.2),rgba(99,102,241,0.2))] hover:text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              შოპი
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
