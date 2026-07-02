// Shared PlayManager card primitives — the PlayGame feed post-card visual
// language (`.pubg-loadout-card` neon border, recolored green/red) + helper
// classes (`.pm-office-*`). The green/red recolor is scoped under `.pm-feedskin`
// (added on the shell wrappers), so these primitives render correctly on any
// PlayManager content page.

import Image from 'next/image';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

export type PmTone = 'green' | 'red';

// ── Card shell (feed post-card) ───────────────────────────────────────────────

export function PmCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="pubg-loadout-link group block h-full">
      <div className={`pubg-loadout-card relative flex h-full flex-col overflow-hidden p-5 sm:p-6 ${className}`}>
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <div className="relative z-[1] flex h-full flex-col space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ── Card header — icon avatar + glowing uppercase title + subtitle + right slot ─

export function PmCardHead({
  icon: Icon,
  title,
  subtitle,
  tone = 'green',
  right,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: PmTone;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5">
      {Icon ? (
        <span className={`pm-office-ava ${tone === 'red' ? 'pm-office-ava--red' : ''}`}>
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className={`pm-office-title truncate text-[15px] leading-tight ${tone === 'red' ? 'pm-office-title--red' : ''}`}>
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

// ── Reaction-style stat pill (GG / PRO / NOOB analog) ─────────────────────────

export function PmPill({ children, tone, className = '' }: { children: ReactNode; tone?: PmTone; className?: string }) {
  return (
    <span className={`pm-office-pill ${tone === 'green' ? 'pm-office-pill--green' : tone === 'red' ? 'pm-office-pill--red' : ''} ${className}`}>
      {children}
    </span>
  );
}

// ── Action button (like the post like / delete buttons) ───────────────────────

export function PmAction({
  children,
  tone = 'green',
  disabled,
  onClick,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  tone?: PmTone;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`pm-office-act ${tone === 'red' ? 'pm-office-act--red' : 'pm-office-act--green'} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Progress gauge (green → red) ──────────────────────────────────────────────

export function PmGauge({ percent, className = '' }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`pm-office-gauge ${className}`}>
      <div className="pm-office-gauge-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ── 4:3 photo card (navigational tile) — photo inset so the neon frame shows ──

export function PmPhotoCard({
  icon: Icon,
  title,
  photo,
  pill,
  tone = 'green',
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  photo: string;
  pill?: string;
  tone?: PmTone;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="pubg-loadout-link group block w-full text-left">
      <div className="pubg-loadout-card relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-[5px] overflow-hidden rounded-[12px]">
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/28 to-black/10" />
        </div>
        <div className="relative z-[1] flex h-full flex-col justify-between p-4">
          <span className={`pm-office-ava self-start ${tone === 'red' ? 'pm-office-ava--red' : ''}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className={`pm-office-title text-[15px] leading-tight ${tone === 'red' ? 'pm-office-title--red' : ''}`}>{title}</p>
            {pill ? (
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <PmPill tone={tone}>{pill}</PmPill>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/60 transition-colors group-hover:text-emerald-300">
                  გახსნა <TrendingUp className="h-3.5 w-3.5" />
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
