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
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
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
    <main className="pm-hq-home relative isolate min-h-[calc(100dvh-56px)] overflow-x-hidden pb-24 text-white xl:pb-0">
      <div className="relative mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-[1240px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.055] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/72 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-white"
              aria-label="უკან დაბრუნება"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200/78">PlayManager</p>
              <h1 className="truncate text-[20px] font-black sm:text-[24px]">Create Team</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 sm:flex">
            <Shield className="h-4 w-4 text-emerald-200" />
            <span className="text-[12px] font-black text-emerald-50">ახალი სეზონის დაწყება</span>
          </div>
        </header>

        <div className="relative mt-4 grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.08fr)_420px]">
          <SpotlightCard className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.42)] sm:p-6 lg:p-8">
            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.95)]" />
                  Launch your club
                </div>

                <div className="space-y-4">
                  <h2 className="max-w-3xl text-4xl font-black leading-[0.98] text-white sm:text-5xl lg:text-6xl">
                    შექმენი გუნდი და შედი ახალ HQ რეჟიმში
                  </h2>
                  <p className="max-w-2xl text-sm font-semibold leading-7 text-white/68 sm:text-base">
                    აქედან იწყება შენი კლუბი. მიიღებ საწყის შემადგენლობას, სტარტერ ბიუჯეტს და პირდაპირ
                    მოხვდები PlayManager-ის ახალ დეშბორდზე.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Feature icon={Users} label="სტარტერი" value="15 მოთამაშე" tone="emerald" />
                  <Feature icon={Banknote} label="ბიუჯეტი" value={formatGel(STARTING_TEAM_BALANCE_GEL)} tone="amber" />
                  <Feature icon={Swords} label="სტატუსი" value="Daily cups unlocked" tone="sky" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[24px] border border-white/10 bg-black/18 p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/44">რატომ ეს flow</p>
                  <div className="mt-4 space-y-3">
                    {quickSteps.map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/80">
                        <span className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-300/12 text-emerald-200">
                          <BadgeCheck className="h-4 w-4" />
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,28,21,0.9),rgba(3,8,6,0.95))] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/44">შენიშვნა</p>
                  <p className="mt-3 text-xl font-black text-white">სახელი უნდა იყოს უნიკალური</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
                    3-30 სიმბოლო. მოკლე, მკაფიო და memorably competitive სახელი ჯობია.
                  </p>
                </div>
              </div>
            </div>
          </SpotlightCard>

          <aside className="rounded-[28px] border border-white/10 bg-white/[0.055] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-4">
            <div className="relative h-full overflow-hidden rounded-[24px] border border-emerald-300/14 bg-[linear-gradient(180deg,rgba(4,16,10,0.96),rgba(2,9,6,0.9))] p-5 sm:p-6">
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Registration</p>
                    <h3 className="mt-2 text-2xl font-black text-white">საფეხბურთო კლუბი</h3>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-white">
                    <Shield className="h-6 w-6" />
                  </span>
                </div>

                <form action={action} className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="team_name" className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                      გუნდის სახელი
                    </label>
                    <input
                      id="team_name"
                      name="team_name"
                      type="text"
                      required
                      minLength={3}
                      maxLength={30}
                      placeholder="მაგ: FC Dream Team"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-[15px] font-bold text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.45)] outline-none transition placeholder:text-white/28 focus:border-emerald-200 focus:bg-emerald-300/10 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12),inset_0_0_20px_rgba(0,0,0,0.35)]"
                    />
                    <p className="text-xs font-medium text-white/45">3-30 სიმბოლო. აირჩიე უნიკალური სახელი.</p>
                  </div>

                  {state && !state.success && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-400/35 bg-red-500/12 p-3 text-sm font-semibold text-white">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                      <p>{ERROR_MESSAGES[state.error] ?? ERROR_MESSAGES.unknown}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-emerald-100/30 bg-emerald-500 px-5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_0_32px_rgba(34,197,94,0.32),inset_0_1px_0_rgba(255,255,255,0.22)] transition hover:bg-emerald-400 hover:shadow-[0_0_46px_rgba(34,197,94,0.48),inset_0_1px_0_rgba(255,255,255,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="relative h-4 w-4" />
                    <span className="relative">{pending ? 'იქმნება...' : 'გუნდის შექმნა'}</span>
                  </button>
                </form>

                <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/44">Instant unlocks</p>
                  <div className="mt-3 grid gap-2">
                    {quickSteps.map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/76">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
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
      ? 'bg-amber-300/10 text-amber-100'
      : tone === 'sky'
      ? 'bg-sky-300/10 text-sky-100'
      : 'bg-emerald-300/10 text-emerald-100';

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/18 p-4 backdrop-blur-md">
      <span className={`grid h-10 w-10 place-items-center rounded-2xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/44">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
