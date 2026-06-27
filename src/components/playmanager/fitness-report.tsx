import { HeartPulse } from 'lucide-react';
import { buildFitnessReport, type FitnessPlayer, type FitnessRisk } from '@/lib/playmanager/fitness';

const RISK_STYLE: Record<FitnessRisk, { label: string; chip: string; bar: string }> = {
  out: { label: 'ტრავმა', chip: 'border-red-300/30 bg-red-500/14 text-red-200', bar: 'bg-red-500' },
  high: { label: 'მაღალი', chip: 'border-orange-300/30 bg-orange-500/12 text-orange-200', bar: 'bg-orange-500' },
  elevated: { label: 'ზომიერი', chip: 'border-amber-300/30 bg-amber-500/12 text-amber-200', bar: 'bg-amber-500' },
  low: { label: 'მზად', chip: 'border-emerald-300/30 bg-emerald-500/12 text-emerald-200', bar: 'bg-emerald-500' },
};

export function FitnessReport({ players }: { players: FitnessPlayer[] }) {
  const report = buildFitnessReport(players);

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(244,63,94,0.10),rgba(255,255,255,0.02))] p-5">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-rose-200" />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200/70">ფიზიკური მდგომარეობა</p>
        </div>
        <h2 className="mt-2 text-2xl font-black text-white">დაღლა და რისკის ანალიზი</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-white/55">{report.headline}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/60">საშ. დაღლა {report.avgFatigue}%</span>
          <span className="rounded-full border border-orange-300/24 bg-orange-500/10 px-2.5 py-1 text-orange-200">რისკი {report.highRiskCount}</span>
          <span className="rounded-full border border-red-300/24 bg-red-500/10 px-2.5 py-1 text-red-200">ტრავმა {report.injuredCount}</span>
        </div>
      </div>

      <div className="space-y-2">
        {report.rows.map((row, i) => {
          const style = RISK_STYLE[row.risk];
          return (
            <div key={`${row.name}-${i}`} className="rounded-[18px] border border-white/8 bg-black/24 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 min-w-[2rem] items-center justify-center rounded bg-white/8 px-1 text-[9px] font-black text-white/45">{row.position}</span>
                  <span className="truncate text-sm font-black text-white">{row.name}</span>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${style.chip}`}>{style.label}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.max(0, Math.min(100, row.fatigue))}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-[11px] font-black tabular-nums text-white/60">{row.fatigue}%</span>
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-white/40">{row.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
