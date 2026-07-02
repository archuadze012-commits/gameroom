import { Search } from 'lucide-react';
import { buildScoutingReport, type ScoutingNeed, type ScoutingPlayer } from '@/lib/playmanager/scouting';

const NEED_STYLE: Record<ScoutingNeed, { label: string; chip: string; bar: string }> = {
  critical: { label: 'კრიტიკული', chip: 'border-red-300/30 bg-red-500/12 text-red-200', bar: 'bg-red-500' },
  thin: { label: 'თხელი', chip: 'border-amber-300/30 bg-amber-500/12 text-amber-200', bar: 'bg-amber-500' },
  aging: { label: 'დაბერებადი', chip: 'border-sky-300/30 bg-sky-500/12 text-sky-200', bar: 'bg-sky-500' },
  ok: { label: 'ბალანსი', chip: 'border-emerald-300/30 bg-emerald-500/12 text-emerald-200', bar: 'bg-emerald-500' },
};

export function ScoutingReport({ squad }: { squad: ScoutingPlayer[] }) {
  const report = buildScoutingReport(squad);

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,0.10),rgba(255,255,255,0.02))] p-5">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-sky-200" />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200/70">სკაუტინგის ანგარიში</p>
        </div>
        <h2 className="mt-2 text-2xl font-black text-white">შემადგენლობის ანალიზი</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-white/55">{report.headline}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {report.groups.map((g) => {
          const style = NEED_STYLE[g.need];
          const depthPct = Math.min(100, Math.round((g.count / g.recommendedDepth) * 100));
          return (
            <div key={g.group} className="rounded-[22px] border border-white/8 bg-black/24 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-base font-black text-white">{g.label}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">{g.group}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${style.chip}`}>
                  {style.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Metric label="რაოდენობა" value={`${g.count}/${g.recommendedDepth}`} />
                <Metric label="საუკ. OVR" value={g.bestOvr ? String(g.bestOvr) : '—'} />
                <Metric label="საშ. ასაკი" value={g.avgAge ? String(g.avgAge) : '—'} />
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${style.bar} transition-all duration-500`} style={{ width: `${depthPct}%` }} />
              </div>

              <p className="mt-3 text-xs font-bold leading-5 text-white/52">{g.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">{label}</p>
      <p className="mt-0.5 text-sm font-black tabular-nums text-white">{value}</p>
    </div>
  );
}
