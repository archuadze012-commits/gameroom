'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Shield,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { formatGel, STARTING_TEAM_BALANCE_GEL } from '@/lib/playmanager/economy';
import { createTeamAction } from './actions';
import type { CreateTeamResult } from './actions';

const ERROR_MESSAGES: Record<string, string> = {
  name_taken: 'ეს სახელი უკვე დაკავებულია. სცადე სხვა.',
  team_exists: 'შენ უკვე გყავს გუნდი.',
  unauthenticated: 'გთხოვ შედი სისტემაში.',
  unknown: 'შეცდომა. სცადე კიდევ ერთხელ.',
};

const quickSteps = [
  'უფასო სტარტერ პაკი ავტომატურად გაიხსნება',
  'ბალანსი ჩაირიცხება გუნდის საფულეში',
  'შემდეგ გადახვალ PlayManager HQ-ში',
];

export function CreateTeamForm() {
  const [state, action, pending] = useActionState<CreateTeamResult | null, FormData>(
    createTeamAction,
    null,
  );

  return (
    <main className="pm-feedskin pm-office pm-hq-shell relative isolate min-h-screen overflow-y-auto bg-background pb-24 text-white xl:pb-0">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Header wrapper */}
        <header className="pubg-loadout-link relative mb-6 block" data-variant="pm-green">
          <div className="pubg-loadout-card relative flex items-center justify-between gap-3 p-4">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            
            <div className="relative z-10 flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-white/10 bg-black/25 text-white/70 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-white"
                aria-label="უკან დაბრუნება"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <p className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-emerald-400">PlayManager</p>
                <h1 className="font-display truncate text-[19px] font-black uppercase tracking-wider text-white">გუნდის რეგისტრაცია</h1>
              </div>
            </div>

            <div className="relative z-10 hidden items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2 sm:flex">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">ახალი სეზონი 2026</span>
            </div>
          </div>
        </header>

        {/* Content split grid */}
        <div className="relative grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_440px]">
          
          {/* Showcase left card */}
          <div className="pubg-loadout-link relative block" data-variant="pm-green">
            <div className="pubg-loadout-card relative flex h-full flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              
              <div className="relative z-10 space-y-6">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)] animate-pulse" />
                  Club Launching Protocol
                </div>

                <div className="space-y-4">
                  <h2 className="font-display max-w-3xl text-3xl font-black uppercase leading-[1.05] text-white sm:text-4xl lg:text-5xl tracking-wide">
                    შექმენი გუნდი და <br className="hidden sm:inline" />
                    ჩაერთე <span className="text-emerald-400">PlayManager</span> რეჟიმში
                  </h2>
                  <p className="max-w-2xl text-sm font-semibold leading-7 text-white/70">
                    აქედან იწყება შენი საფეხბურთო კლუბი. რეგისტრაციისთანავე მიიღებ საწყის შემადგენლობას, სტარტერ ბიუჯეტს და პირდაპირ მოხვდები PlayManager-ის ინტერაქტიულ HQ-ში.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Feature icon={Users} label="სტარტერი" value="15 მოთამაშე" tone="emerald" />
                  <Feature icon={Banknote} label="ბიუჯეტი" value={formatGel(STARTING_TEAM_BALANCE_GEL)} tone="amber" />
                  <Feature icon={Swords} label="ტურნირი" value="Daily cups unlocked" tone="sky" />
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-white/5 bg-black/40 p-5 backdrop-blur-md">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80">კლუბის სტარტერ პაკეტი</p>
                  <div className="mt-4 space-y-3.5">
                    {quickSteps.map((item) => (
                      <div key={item} className="flex items-center gap-3 text-[13px] font-semibold text-white/80">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                          <BadgeCheck className="h-4 w-4" />
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/15 p-5 backdrop-blur-md">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/80">მნიშვნელოვანი შენიშვნა</p>
                  <p className="mt-3 text-lg font-black text-white leading-tight">სახელი უნდა იყოს უნიკალური</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-white/60">
                    გუნდის სახელი უნდა შედგებოდეს 3-30 სიმბოლოსგან და არ უნდა მეორდებოდეს სხვა კლუბის დასახელებასთან.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form right card */}
          <aside className="pubg-loadout-link relative block" data-variant="pm-green">
            <div className="pubg-loadout-card relative flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Club Registration</p>
                    <h3 className="font-display mt-2 text-2xl font-black uppercase tracking-wider text-white">კლუბის შექმნა</h3>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-400 shadow-[0_0_16px_rgba(34,197,94,0.2)]">
                    <Shield className="h-6 w-6" />
                  </span>
                </div>

                <form action={action} className="space-y-6">
                  <div className="space-y-2.5">
                    <label htmlFor="team_name" className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
                      გუნდის დასახელება
                    </label>
                    <input
                      id="team_name"
                      name="team_name"
                      type="text"
                      required
                      minLength={3}
                      maxLength={30}
                      placeholder="მაგ: FC Dinamo"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-[15px] font-bold text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.55)] outline-none transition placeholder:text-white/25 focus:border-emerald-400 focus:bg-emerald-950/20 focus:ring-1 focus:ring-emerald-400/50"
                    />
                    <p className="text-[11px] font-semibold text-white/40">3-30 სიმბოლო. აირჩიე ჟღერადი და დასამახსოვრებელი სახელი.</p>
                  </div>

                  {state && !state.success && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-950/20 p-3.5 text-xs font-semibold text-red-200">
                      <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-400" />
                      <p>{ERROR_MESSAGES[state.error] ?? ERROR_MESSAGES.unknown}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="group relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_32px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:bg-emerald-500 hover:shadow-[0_0_46px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-4.5 w-4.5 text-emerald-200" />
                    <span>{pending ? 'რეგისტრირდება...' : 'კლუბის გაშვება'}</span>
                  </button>
                </form>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">მყისიერი ბონუსები</p>
                  <div className="mt-3.5 space-y-2.5">
                    {quickSteps.map((item) => (
                      <div key={item} className="flex items-center gap-2.5 text-[12.5px] font-semibold text-white/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: 'emerald' | 'amber' | 'sky';
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
      : tone === 'sky'
      ? 'bg-sky-500/10 text-sky-300 border-sky-500/25'
      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';

  return (
    <div className="rounded-2xl border border-white/5 bg-black/40 p-4 backdrop-blur-md">
      <span className={`grid h-10 w-10 place-items-center rounded-xl border ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-white/44">{label}</p>
      <p className="mt-1 text-lg font-black text-white leading-none">{value}</p>
    </div>
  );
}
