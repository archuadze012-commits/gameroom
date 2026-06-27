import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, CalendarDays, Trophy } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerMatchArchive, type ArchiveMatch } from '@/lib/playmanager/archive';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';

export const dynamic = 'force-dynamic';

export default async function MatchHistoryPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager/history');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const matches = await getPlayManagerMatchArchive(team.id);
  const wins = matches.filter((m) => m.result === 'W').length;
  const draws = matches.filter((m) => m.result === 'D').length;
  const losses = matches.filter((m) => m.result === 'L').length;

  return (
    <PlayManagerLightShell>
      <section className="relative overflow-hidden rounded-xl bg-[#020806]/90 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,197,94,0.18),transparent_30%),radial-gradient(circle_at_86%_30%,rgba(127,29,29,0.22),transparent_36%),linear-gradient(135deg,rgba(2,18,10,0.98),rgba(0,0,0,0.98)_60%)]" />
        </div>

        <div className="relative z-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link
                href="/playmanager/arena"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/18 bg-black/44 text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-300/10"
                aria-label="უკან არენაზე"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-200/70">Match archive</p>
                <h1 className="mt-2 flex items-center gap-3 text-3xl font-black leading-none text-white sm:text-4xl">
                  <CalendarDays className="h-7 w-7 text-emerald-300" />
                  მატჩების ისტორია
                </h1>
                <p className="mt-2 text-sm font-bold text-white/52">{team.name} · ყველა ლიგა და თასის მატჩი</p>
              </div>
            </div>

            <div className="flex gap-2">
              <RecordPill label="მოგება" value={wins} tone="green" />
              <RecordPill label="ფრე" value={draws} tone="gold" />
              <RecordPill label="წაგება" value={losses} tone="red" />
            </div>
          </div>

          {matches.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {matches.map((match) => (
                <MatchHistoryCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/40 py-16 text-center">
              <Trophy className="mb-3 h-10 w-10 text-white/22" />
              <p className="text-lg font-black text-white/70">ჯერ მატჩები არ ჩატარებულა</p>
              <p className="mt-1 text-sm font-bold text-white/38">არენაზე დაიწყე პირველი მატჩი და შედეგი აქ გამოჩნდება.</p>
            </div>
          )}
        </div>
      </section>
    </PlayManagerLightShell>
  );
}

function RecordPill({ label, value, tone }: { label: string; value: number; tone: 'green' | 'gold' | 'red' }) {
  const cls = {
    green: 'border-emerald-300/26 bg-emerald-300/10 text-emerald-100',
    gold: 'border-yellow-300/26 bg-yellow-300/10 text-yellow-100',
    red: 'border-red-300/26 bg-red-400/10 text-red-100',
  }[tone];
  return (
    <div className={`rounded-2xl border px-4 py-2 text-center ${cls}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] opacity-70">{label}</p>
    </div>
  );
}

function MatchHistoryCard({ match }: { match: ArchiveMatch }) {
  const resultColor =
    match.result === 'W' ? 'text-emerald-400' : match.result === 'L' ? 'text-red-400' : 'text-yellow-400';
  const resultBorder =
    match.result === 'W' ? 'border-emerald-500/26' : match.result === 'L' ? 'border-red-500/26' : 'border-yellow-500/26';
  const compTone =
    match.competition === 'cup'
      ? 'border-yellow-300/24 bg-yellow-300/10 text-yellow-100'
      : 'border-emerald-300/20 bg-emerald-300/8 text-emerald-100';

  return (
    <div className={`overflow-hidden rounded-2xl border ${resultBorder} bg-black/40 p-4`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${compTone}`}>
          {match.competition === 'cup' ? <Trophy className="h-3 w-3" /> : null}
          {match.competitionName} · {match.round} ტური
        </span>
        {match.date ? <span className="text-[10px] font-black text-white/34">{match.date}</span> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/38">
            {match.venue === 'Home' ? 'საშინაო' : match.venue === 'Away' ? 'გასვლითი' : 'მოწინააღმდეგე'}
          </p>
          <p className="mt-0.5 truncate text-base font-black text-white">{match.opponent}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black tabular-nums ${resultColor}`}>{match.score}</p>
          <span className={`text-[11px] font-black ${resultColor}`}>
            {match.result === 'W' ? 'მოგება' : match.result === 'L' ? 'წაგება' : 'ფრე'}
          </span>
        </div>
      </div>

      {match.incomeLabel || match.attendanceLabel ? (
        <div className="mt-3 flex items-center gap-2 border-t border-white/6 pt-3 text-[10px] font-black text-white/44">
          {match.attendanceLabel ? <span>👥 {match.attendanceLabel}</span> : null}
          {match.incomeLabel ? <span className="text-emerald-200/70">💰 {match.incomeLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
