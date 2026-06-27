import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Trophy, Star, Sparkles } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerTrophyRoom, type Trophy as TrophyItem } from '@/lib/playmanager/archive';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';

export const dynamic = 'force-dynamic';

export default async function MuseumPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager/museum');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const trophies = await getPlayManagerTrophyRoom(team.id);
  const cupCount = trophies.filter((t) => t.kind === 'cup').length;
  const leagueCount = trophies.filter((t) => t.kind === 'league').length;

  return (
    <PlayManagerLightShell>
      <section className="relative overflow-hidden rounded-xl bg-[#0a0702]/90 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(234,179,8,0.2),transparent_30%),radial-gradient(circle_at_84%_28%,rgba(217,119,6,0.18),transparent_36%),linear-gradient(135deg,rgba(18,12,2,0.98),rgba(0,0,0,0.98)_60%)]" />
        </div>

        <div className="relative z-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link
                href="/playmanager/arena"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-yellow-300/18 bg-black/44 text-yellow-100 transition hover:border-yellow-200/40 hover:bg-yellow-300/10"
                aria-label="უკან არენაზე"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-200/70">Trophy room</p>
                <h1 className="mt-2 flex items-center gap-3 text-3xl font-black leading-none text-white sm:text-4xl">
                  <Trophy className="h-7 w-7 text-yellow-300" />
                  ტროფეების მუზეუმი
                </h1>
                <p className="mt-2 text-sm font-bold text-white/52">{team.name} · მოგებული თასები და ტიტულები</p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="rounded-2xl border border-yellow-300/26 bg-yellow-300/10 px-4 py-2 text-center text-yellow-100">
                <p className="text-2xl font-black leading-none">{cupCount}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] opacity-70">თასი</p>
              </div>
              <div className="rounded-2xl border border-emerald-300/26 bg-emerald-300/10 px-4 py-2 text-center text-emerald-100">
                <p className="text-2xl font-black leading-none">{leagueCount}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] opacity-70">ტიტული</p>
              </div>
            </div>
          </div>

          {trophies.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trophies.map((trophy) => (
                <TrophyCard key={trophy.id} trophy={trophy} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-yellow-300/16 bg-black/40 py-16 text-center">
              <Trophy className="mb-3 h-12 w-12 text-yellow-300/30" />
              <p className="text-lg font-black text-white/70">მუზეუმი ჯერ ცარიელია</p>
              <p className="mt-1 max-w-md text-sm font-bold text-white/38">
                მოიგე თასი ან ლიგის ტიტული და შენი პირველი ტროფი აქ გამოიფინება.
              </p>
              <Link
                href="/playmanager/league"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-yellow-200/28 bg-yellow-300 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-200"
              >
                <Sparkles className="h-4 w-4" />
                ტურნირზე გადასვლა
              </Link>
            </div>
          )}
        </div>
      </section>
    </PlayManagerLightShell>
  );
}

function TrophyCard({ trophy }: { trophy: TrophyItem }) {
  const isGold = trophy.accent === 'gold';
  const ring = isGold ? 'border-yellow-300/30' : 'border-emerald-300/30';
  const glow = isGold ? 'rgba(234,179,8,0.18)' : 'rgba(16,185,129,0.16)';
  const iconBg = isGold ? 'bg-yellow-300/12 text-yellow-200' : 'bg-emerald-300/12 text-emerald-200';

  return (
    <div
      className={`group relative flex flex-col items-center overflow-hidden rounded-[22px] border ${ring} bg-gradient-to-b from-black/40 via-black/70 to-black/85 p-5 text-center transition hover:-translate-y-1`}
      style={{ boxShadow: `0 0 36px ${glow}, inset 0 0 0 1px rgba(255,255,255,0.04)` }}
    >
      <div className={`grid h-20 w-20 place-items-center rounded-3xl border ${ring} ${iconBg}`}>
        {trophy.kind === 'cup' ? <Trophy className="h-10 w-10" /> : <Star className="h-10 w-10" />}
      </div>
      <h3 className="mt-4 text-base font-black leading-tight text-white">{trophy.title}</h3>
      <p className={`mt-1 text-xs font-black uppercase tracking-[0.14em] ${isGold ? 'text-yellow-200/72' : 'text-emerald-200/72'}`}>
        {trophy.subtitle}
      </p>
      <div className="mt-3 flex w-full items-center justify-between border-t border-white/8 pt-3 text-[10px] font-black text-white/42">
        <span>{trophy.date || '—'}</span>
        {trophy.prizeLabel ? <span className="text-yellow-200/72">{trophy.prizeLabel}</span> : null}
      </div>
    </div>
  );
}
