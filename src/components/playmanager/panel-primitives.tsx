'use client';

import type { ReactNode } from 'react';

export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62 ${className}`}>
      {children}
    </p>
  );
}

export function NestedStatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/24 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1.5 text-2xl font-black text-white">{value}</p>
      {sub ? <p className="mt-1 text-[11px] font-bold text-white/45">{sub}</p> : null}
    </div>
  );
}

export function NestedMiniBox({
  label,
  value,
  valueClassName = 'text-white',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className={`mt-0.5 text-sm font-black ${valueClassName}`}>{value}</p>
    </div>
  );
}
