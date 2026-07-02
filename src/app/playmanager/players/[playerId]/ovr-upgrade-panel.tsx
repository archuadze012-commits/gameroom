'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { confirmPlayManagerOvrUpgrade } from '@/app/playmanager/actions';

export type FodderOption = {
  id: string;
  name: string;
  ovr: number;
  talent: number;
  position: string;
};

export function OvrUpgradePanel({
  playerId,
  oldOvr,
  newOvr,
  fodderCost,
  fodder,
}: {
  playerId: string;
  oldOvr: number;
  newOvr: number;
  fodderCost: number;
  fodder: FodderOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Pre-select the cheapest (lowest-OVR) fodder up to the required count.
  const initial = useMemo(() => {
    const sorted = [...fodder].sort((a, b) => a.ovr - b.ovr);
    return new Set(sorted.slice(0, fodderCost).map((f) => f.id));
  }, [fodder, fodderCost]);
  const [selected, setSelected] = useState<Set<string>>(initial);

  const enough = fodder.length >= fodderCost;
  const ready = selected.size >= fodderCost;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    if (!ready) return;
    startTransition(async () => {
      const result = await confirmPlayManagerOvrUpgrade(playerId, Array.from(selected));
      if (result.success) {
        toast.success(result.message ?? 'OVR აფგრეიდი დადასტურდა');
        router.refresh();
      } else {
        toast.error(
          result.error === 'insufficient_fodder'
            ? 'საკმარისი Pro ბარათი არ არის'
            : result.error === 'no_upgrade_available'
              ? 'აფგრეიდი მიუწვდომელია'
              : 'ვერ მოხერხდა',
        );
      }
    });
  }

  return (
    <div className="rounded-[22px] border border-emerald-300/24 bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(245,158,11,0.03))] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/72">upgrade available</p>
          <p className="mt-1 text-lg font-black text-white">OVR აფგრეიდი მზადაა</p>
        </div>
        <p className="text-3xl font-black tabular-nums text-emerald-100">
          {oldOvr}<span className="mx-1 text-base text-white/40">→</span>{newOvr}
        </p>
      </div>

      <p className="mt-2 text-[11px] font-bold leading-5 text-white/52">
        განვითარების ქულები გასააქტიურებლად შესწირე {fodderCost} Pro-კლასის ბარათი (ტალანტი 1–3).
      </p>

      {!enough ? (
        <p className="mt-3 rounded-xl border border-red-300/24 bg-red-500/10 px-3 py-2 text-[11px] font-black text-red-100">
          საჭიროა {fodderCost} Pro ბარათი · გაქვს {fodder.length}. იყიდე Pro ფოდერ პაკი მაღაზიაში.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em] text-white/40">
            <span>აირჩიე შესაწირი</span>
            <span className={selected.size >= fodderCost ? 'text-emerald-200' : 'text-emerald-200'}>
              {selected.size}/{fodderCost}
            </span>
          </div>
          <div className="mt-2 max-h-52 space-y-1.5 overflow-y-auto pr-1">
            {[...fodder]
              .sort((a, b) => a.ovr - b.ovr)
              .map((f) => {
                const on = selected.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggle(f.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${
                      on
                        ? 'border-emerald-300/40 bg-emerald-300/12'
                        : 'border-white/8 bg-black/24 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] ${
                          on ? 'border-emerald-300/50 bg-emerald-300/25 text-emerald-50' : 'border-white/20 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span className="truncate text-xs font-black text-white">{f.name}</span>
                      <span className="text-[10px] font-bold text-white/38">{f.position}</span>
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-white/70">{f.ovr}</span>
                  </button>
                );
              })}
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || pending}
            className="mt-3 h-10 w-full rounded-xl border border-emerald-300/30 bg-emerald-300/16 px-3 text-sm font-black text-emerald-50 transition hover:bg-emerald-300/24 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? '...' : `დაადასტურე · ${fodderCost} ბარათი შეიწირება`}
          </button>
        </>
      )}
    </div>
  );
}
