'use client';

import { motion } from 'motion/react';
import { ArrowDownUp, Crosshair, Gauge, ShieldHalf, Compass } from 'lucide-react';
import {
  DEFENSIVE_LINE_OPTIONS,
  FOCUS_SIDE_OPTIONS,
  FORMATION_KEYS,
  TACTICAL_STYLE_OPTIONS,
  TEMPO_OPTIONS,
  type MatchTactics,
} from '@/lib/playmanager/formations';

type SegmentRow<Key extends keyof MatchTactics> = {
  key: Key;
  label: string;
  icon: typeof Gauge;
  options: readonly (readonly [MatchTactics[Key], string])[];
};

const ROWS = [
  { key: 'tacticalStyle', label: 'სტილი', icon: Crosshair, options: TACTICAL_STYLE_OPTIONS },
  { key: 'defensiveLine', label: 'დაცვის ხაზი', icon: ShieldHalf, options: DEFENSIVE_LINE_OPTIONS },
  { key: 'tempo', label: 'ტემპი', icon: Gauge, options: TEMPO_OPTIONS },
  { key: 'focusSide', label: 'ფლანგი', icon: Compass, options: FOCUS_SIDE_OPTIONS },
] as const;

export function LineupTacticControls({
  formation,
  tactics,
  onFormationChange,
  onTacticChange,
}: {
  formation: string;
  tactics: MatchTactics;
  onFormationChange: (formation: string) => void;
  onTacticChange: <Key extends keyof MatchTactics>(key: Key, value: MatchTactics[Key]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2.5 flex items-center gap-2 text-emerald-200/70">
          <ArrowDownUp className="h-3.5 w-3.5" />
          <p className="text-[10px] font-black uppercase tracking-[0.22em]">ფორმაცია</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {FORMATION_KEYS.map((key) => {
            const active = key === formation;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onFormationChange(key)}
                className={`relative isolate rounded-xl border px-2 py-2 text-[11px] font-black tabular-nums transition ${
                  active
                    ? 'border-emerald-300/40 text-emerald-50'
                    : 'border-white/8 bg-white/[0.03] text-white/55 hover:border-emerald-300/20 hover:text-white'
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="formation-active-chip"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-emerald-300/16 shadow-[0_0_22px_rgba(16,185,129,0.28),inset_0_0_0_1px_rgba(110,231,183,0.35)]"
                  />
                ) : null}
                {key}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3.5">
        {(ROWS as readonly SegmentRow<keyof MatchTactics>[]).map((row) => {
          const Icon = row.icon;
          const current = tactics[row.key];
          return (
            <div key={row.key}>
              <div className="mb-1.5 flex items-center gap-2 text-white/45">
                <Icon className="h-3.5 w-3.5" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">{row.label}</p>
              </div>
              <div className="flex gap-1 rounded-2xl border border-white/8 bg-black/30 p-1">
                {row.options.map(([value, label]) => {
                  const active = value === current;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onTacticChange(row.key, value)}
                      className={`relative isolate flex-1 rounded-xl px-2 py-2 text-[11px] font-black leading-tight transition ${
                        active ? 'text-emerald-950' : 'text-white/55 hover:text-white'
                      }`}
                    >
                      {active ? (
                        <motion.span
                          layoutId={`seg-${row.key}`}
                          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                          className="absolute inset-0 -z-10 rounded-xl bg-[linear-gradient(180deg,#6ee7b7,#34d399)] shadow-[0_6px_18px_rgba(16,185,129,0.4)]"
                        />
                      ) : null}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
