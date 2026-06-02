import { CheckCircle2 } from "lucide-react";

type LinkedAccount = {
  provider: "steam" | "riot";
  external_id: string;
  data: {
    personaName?: string;
    profileUrl?: string;
    gameCount?: number;
    riotId?: string;
    tierName?: string;
    tierEmoji?: string;
  } | null;
  verified: boolean;
};

export function ProfileLinkedAccounts({ accounts }: { accounts: LinkedAccount[] }) {
  if (accounts.length === 0) return null;

  const steam = accounts.find((a) => a.provider === "steam");
  const riot = accounts.find((a) => a.provider === "riot");
  const panelClip = "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)";

  return (
    <div
      className="relative overflow-hidden p-4 ring-1 ring-white/[0.08]"
      style={{
        background:
          "linear-gradient(180deg,color-mix(in_srgb,var(--gr-bg-1)_96%,black),color-mix(in_srgb,var(--gr-bg-2)_90%,black))",
        clipPath: panelClip,
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,var(--gr-cyan-glow),var(--gr-magenta),transparent)]" />
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--gr-cyan-glow)]">
          დაკავშირებული ანგარიშები
        </p>
        <div className="flex flex-wrap gap-2.5">
        {steam && (
          <a
            href={steam.data?.profileUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-2.5 overflow-hidden px-3.5 py-2 text-xs text-[var(--gr-text)] ring-1 ring-sky-400/20 transition-all hover:-translate-y-0.5 hover:ring-sky-300/45"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(8,6,15,0.92))",
              clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
            }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,rgba(34,211,238,0.85),transparent)]" />
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-sky-400/14 text-sky-300 ring-1 ring-sky-300/20">🎮</span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-sky-300/78">Steam</span>
              <span className="block truncate font-semibold text-white/92">{steam.data?.personaName ?? "Steam"}</span>
            </span>
            {steam.data?.gameCount != null && (
              <span className="ml-auto shrink-0 rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-200">
                {steam.data.gameCount} თამაში
              </span>
            )}
            {steam.verified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />}
          </a>
        )}
        {riot && (
          <div
            className="group relative flex items-center gap-2.5 overflow-hidden px-3.5 py-2 text-xs text-[var(--gr-text)] ring-1 ring-rose-400/20"
            style={{
              background: "linear-gradient(135deg, rgba(192,38,211,0.12), rgba(8,6,15,0.92))",
              clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
            }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,rgba(192,38,211,0.9),transparent)]" />
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-rose-400/14 text-rose-300 ring-1 ring-rose-300/20">🎯</span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-rose-300/78">Riot</span>
              <span className="block truncate font-semibold text-white/92">{riot.data?.riotId ?? "Riot ID"}</span>
            </span>
            {riot.data?.tierName && (
              <span className="ml-auto shrink-0 rounded-full border border-rose-300/25 bg-rose-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-200">
                {riot.data.tierEmoji} {riot.data.tierName}
              </span>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
