'use client';

import { useActionState } from 'react';
import { AlertTriangle, BadgeCheck, Banknote, Shield, Sparkles, Users } from 'lucide-react';
import { formatGel, STARTING_TEAM_BALANCE_GEL } from '@/lib/playmanager/economy';
import { createTeamAction } from './actions';
import type { CreateTeamResult } from './actions';

const ERROR_MESSAGES: Record<string, string> = {
  name_taken: 'ეს სახელი უკვე დაკავებულია. სცადე სხვა.',
  team_exists: 'შენ უკვე გყავს გუნდი.',
  unauthenticated: 'გთხოვ შედი სისტემაში.',
  unknown: 'შეცდომა. სცადე კიდევ ერთხელ.',
};

export function CreateTeamForm() {
  const [state, action, pending] = useActionState<CreateTeamResult | null, FormData>(
    createTeamAction,
    null,
  );

  return (
    <div className="relative isolate -m-6 min-h-[calc(100dvh-57px)] overflow-hidden bg-[#020603] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(34,197,94,0.36),transparent_28%),radial-gradient(circle_at_84%_6%,rgba(127,29,29,0.18),transparent_24%),linear-gradient(135deg,rgba(4,18,9,0.98),rgba(1,4,3,0.96)_48%,rgba(9,2,2,0.94))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-105px)] w-full max-w-7xl items-center gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.72fr)]">
        <section className="pm-neon-frame relative rounded-[28px] border border-emerald-300/20 bg-black/30 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.58),inset_0_0_44px_rgba(34,197,94,0.08)] backdrop-blur-xl sm:p-8 lg:min-h-[620px]">
          <div className="absolute inset-4 rounded-[22px] border border-emerald-300/18" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="flex flex-col gap-6 lg:max-w-2xl">
              <div className="inline-flex w-fit items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.95)]" />
                Club creation terminal
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                  შექმენი საფეხბურთო კლუბი
                </h1>
                <p className="max-w-xl text-base font-medium leading-7 text-white/72 sm:text-lg">
                  PlayManager გაძლევს სტარტერ შემადგენლობას, საწყის ბიუჯეტს და პირველ პოზიციას სატრანსფერო ბაზარზე. შეარჩიე უნიკალური სახელი შენი გუნდისთვის
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Feature icon={Users} label="სტარტერი" value="15 მოთამაშე" />
              <Feature icon={Banknote} label="ბიუჯეტი" value={formatGel(STARTING_TEAM_BALANCE_GEL)} />
              <Feature icon={BadgeCheck} label="სტატუსი" value="ყოველდღიური თასები" />
            </div>
          </div>

          <div className="absolute bottom-8 left-8 hidden max-w-56 lg:block">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/54">გაითვალისწინე!</p>
            <p className="mt-1 text-sm font-bold text-white/86">სახელი უნდა იყოს უნიკალური</p>
          </div>
        </section>

        <aside className="pm-neon-frame relative rounded-[28px] p-[1px] shadow-[0_20px_70px_rgba(0,0,0,0.62),0_0_60px_rgba(34,197,94,0.12)]">
          <div className="relative overflow-hidden rounded-[27px] border border-emerald-300/20 bg-[#031008]/88 p-5 backdrop-blur-2xl sm:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_22%_0%,rgba(34,197,94,0.25),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_38%)]"
            />
            <div className="relative z-10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/72">რეგისტრაცია</p>
                  <h2 className="mt-2 text-2xl font-black text-white">საფეხბურთო კლუბი</h2>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 text-white">
                  <Shield className="h-6 w-6" />
                </span>
              </div>

              <form action={action} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="team_name" className="text-[11px] font-black uppercase tracking-[0.18em] text-white/72">
                    გუნდის სახელი
                  </label>
                  <input
                    id="team_name"
                    name="team_name"
                    type="text"
                    required
                    minLength={3}
                    maxLength={30}
                    placeholder="მაგ: FC dream team"
                    className="h-14 w-full rounded-2xl border border-emerald-300/28 bg-black/45 px-4 text-[15px] font-bold text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.45)] outline-none transition placeholder:text-white/28 focus:border-emerald-200 focus:bg-emerald-300/10 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12),inset_0_0_20px_rgba(0,0,0,0.35)]"
                  />
                  <p className="text-xs font-medium text-white/45">3-30 სიმბოლო. აირჩიე უნიკალური სახელი.</p>
                </div>

                {state && !state.success && (
                  <div className="pm-neon-frame pm-neon-frame-red flex items-start gap-3 rounded-2xl border border-red-400/35 bg-red-500/12 p-3 text-sm font-semibold text-white">
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

              <div className="grid gap-3 border-t border-white/10 pt-5">
                {['უფასო სტარტერ პაკი ავტომატურად გაიხსნება', 'ბალანსი ჩაირიცხება გუნდის საფულეში', 'შემდეგ გადახვალ დაშბორდზე'].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/76">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="pm-neon-frame rounded-2xl border border-emerald-300/18 bg-emerald-300/8 p-4 backdrop-blur-md">
      <Icon className="mb-4 h-5 w-5 text-white" />
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/52">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
