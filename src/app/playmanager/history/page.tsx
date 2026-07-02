import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, CalendarDays, Trophy } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerMatchArchive, type ArchiveMatch } from '@/lib/playmanager/archive';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill, type PmTone } from '@/components/playmanager/pm-cards';

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
      <div className="mx-auto w-full max-w-[1100px] space-y-4">
        <PmCard>
          <PmCardHead
            icon={CalendarDays}
            title="მატჩების ისტორია"
            subtitle={`${team.name} · ყველა ლიგა და თასის მატჩი`}
            right={
              <div className="flex items-center gap-2">
                <PmPill tone="green">{wins} მოგება</PmPill>
                <PmPill>{draws} ფრე</PmPill>
                <PmPill tone="red">{losses} წაგება</PmPill>
                <Link
                  href="/playmanager/arena"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-300/18 bg-black/44 text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-300/10"
                  aria-label="უკან არენაზე"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </div>
            }
          />
        </PmCard>

        {matches.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => (
              <MatchHistoryCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <PmCard className="items-center py-16 text-center">
            <Trophy className="mb-3 h-10 w-10 text-white/22" />
            <p className="text-lg font-black text-white/70">ჯერ მატჩები არ ჩატარებულა</p>
            <p className="mt-1 text-sm font-bold text-white/38">არენაზე დაიწყე პირველი მატჩი და შედეგი აქ გამოჩნდება.</p>
          </PmCard>
        )}
      </div>
    </PlayManagerLightShell>
  );
}

function MatchHistoryCard({ match }: { match: ArchiveMatch }) {
  const tone: PmTone | undefined =
    match.result === 'W' ? 'green' : match.result === 'L' ? 'red' : undefined;
  const resultColor =
    match.result === 'W' ? 'text-emerald-400' : match.result === 'L' ? 'text-red-400' : 'text-white/70';

  return (
    <PmCard>
      <PmCardHead
        icon={match.competition === 'cup' ? Trophy : CalendarDays}
        title={match.opponent}
        subtitle={
          match.venue === 'Home' ? 'საშინაო' : match.venue === 'Away' ? 'გასვლითი' : 'მოწინააღმდეგე'
        }
        tone={tone ?? 'green'}
        right={
          <div className="text-right">
            <p className={`text-2xl font-black tabular-nums ${resultColor}`}>{match.score}</p>
            <span className={`text-[11px] font-black ${resultColor}`}>
              {match.result === 'W' ? 'მოგება' : match.result === 'L' ? 'წაგება' : 'ფრე'}
            </span>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <PmPill tone={match.competition === 'cup' ? 'green' : undefined}>
          {match.competitionName} · {match.round} ტური
        </PmPill>
        {match.date ? <PmPill>{match.date}</PmPill> : null}
      </div>

      {match.incomeLabel || match.attendanceLabel ? (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {match.attendanceLabel ? <PmPill>👥 {match.attendanceLabel}</PmPill> : null}
          {match.incomeLabel ? <PmPill tone="green">💰 {match.incomeLabel}</PmPill> : null}
        </div>
      ) : null}
    </PmCard>
  );
}
