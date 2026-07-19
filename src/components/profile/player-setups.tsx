import { Mouse, Keyboard, Headphones, Monitor, Gauge, Cpu } from "lucide-react";

export type PlayerSetup = {
  gameName: string;
  device: string | null;
  mouse: string | null;
  keyboard: string | null;
  headset: string | null;
  monitor: string | null;
  sensitivity: string | null;
  notes: string | null;
};

const ROWS: { key: keyof Omit<PlayerSetup, "gameName" | "notes">; label: string; Icon: typeof Mouse }[] = [
  { key: "device", label: "მოწყობილობა", Icon: Cpu },
  { key: "sensitivity", label: "Sensitivity", Icon: Gauge },
  { key: "mouse", label: "მაუსი", Icon: Mouse },
  { key: "keyboard", label: "კლავიატურა", Icon: Keyboard },
  { key: "headset", label: "ყურსასმენი", Icon: Headphones },
  { key: "monitor", label: "მონიტორი", Icon: Monitor },
];

export function PlayerSetups({ setups }: { setups: PlayerSetup[] }) {
  const withData = setups.filter((s) => ROWS.some((r) => s[r.key]) || s.notes);
  if (withData.length === 0) return null;

  return (
    <div className="pubg-loadout-link block" data-variant="strike">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-violet-hi)]/70" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
            <Cpu className="h-4 w-4 text-[var(--gr-violet-hi)]" /> სეტაპი
          </div>
          <div className="space-y-5">
            {withData.map((s, i) => (
              <div key={i}>
                <div className="mb-2 text-[12px] font-black text-white">{s.gameName}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ROWS.filter((r) => s[r.key]).map((r) => (
                    <div key={r.key} className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <r.Icon className="h-4 w-4 shrink-0 text-[var(--gr-violet-hi)]" />
                      <div className="min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-wider text-white/35">{r.label}</div>
                        <div className="truncate text-[12px] font-bold text-white/85">{s[r.key]}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {s.notes && <p className="mt-2 text-[12px] leading-relaxed text-white/55">{s.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
