import type { LobbyHudData } from "@/types/lobby";

type LobbyRpBarProps = {
  royalePass: LobbyHudData["royalePass"];
};

export function LobbyRpBar({ royalePass }: LobbyRpBarProps) {
  const progress = `${Math.max(0, Math.min(1, royalePass.rankProgress)) * 100}%`;

  return (
    <section className="pointer-events-auto min-w-[250px] bg-[color-mix(in_srgb,var(--gr-bg-0)_74%,transparent)] px-4 py-2 shadow-[var(--gr-card-shadow)] ring-1 ring-[var(--gr-border)] backdrop-blur-md [clip-path:polygon(10px_0,100%_0,100%_calc(100%_-_10px),calc(100%_-_10px)_100%,0_100%,0_10px)] max-[640px]:min-w-0 max-[640px]:w-full max-[640px]:px-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--gr-amber)] shadow-[0_0_14px_var(--gr-amber)] motion-safe:animate-pulse" />
          <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.14em] text-white max-[640px]:text-[11px]">
            RP {royalePass.rank}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--gr-text-mute)] max-[640px]:text-[9px]">
          Season {royalePass.season}
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gr-amber)_16%,transparent)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--gr-amber),var(--gr-magenta))]"
          style={{ width: progress }}
        />
      </div>

      {royalePass.hasUnclaimedRewards ? (
        <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--gr-amber)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--gr-amber)] motion-safe:animate-pulse" />
          Reward
        </div>
      ) : null}
    </section>
  );
}
