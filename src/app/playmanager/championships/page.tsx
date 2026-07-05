import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { hasPermission } from '@/lib/admin';
import { processDueLeagueMatches } from '@/lib/playmanager/leagues';
import { CreateLeagueForm, JoinLeagueButton, StartLeagueButton } from './championships-client';

export const dynamic = 'force-dynamic';

type LeagueRow = {
  id: string;
  name: string;
  division_level: number;
  status: 'registration' | 'in_progress' | 'completed';
  format: 'round_robin' | 'knockout';
  max_teams: number;
  prize_pool: number;
};
type ParticipantRow = {
  league_id: string;
  team_id: string;
  played: number; won: number; drawn: number; lost: number;
  goals_for: number; goals_against: number; points: number;
};
type FixtureRow = {
  league_id: string; round: number;
  home_team_id: string; away_team_id: string;
  home_goals: number | null; away_goals: number | null;
  status: string;
};

const DIV_LABEL = ['', 'A', 'B', 'C', 'D'];
const STATUS_META: Record<string, { label: string; tone: 'green' | 'red' | undefined }> = {
  registration: { label: 'რეგისტრაცია', tone: 'green' },
  in_progress: { label: 'მიმდინარე', tone: 'red' },
  completed: { label: 'დასრულდა', tone: undefined },
};

export default async function ChampionshipsPage() {
  // Lazy: simulate any league fixtures whose kickoff time has passed.
  await processDueLeagueMatches();

  const db = await createSupabaseServerClient();
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) redirect('/auth/login?next=/playmanager/championships');

  const team = await getTeam(userData.user.id);
  const isAdmin = await hasPermission('manage_content');

  const [{ data: leagueRows }, { data: participantRows }, { data: fixtureRows }] = await Promise.all([
    db.from('pm_league_instances').select('id,name,division_level,status,format,max_teams,prize_pool').order('created_at', { ascending: false }).returns<LeagueRow[]>(),
    db.from('pm_league_participants').select('league_id,team_id,played,won,drawn,lost,goals_for,goals_against,points').returns<ParticipantRow[]>(),
    db.from('pm_league_fixtures').select('league_id,round,home_team_id,away_team_id,home_goals,away_goals,status').order('round', { ascending: true }).returns<FixtureRow[]>(),
  ]);

  const leagues = leagueRows ?? [];
  const participants = participantRows ?? [];
  const fixtures = fixtureRows ?? [];

  // Resolve team names for everyone referenced.
  const teamIds = Array.from(new Set([
    ...participants.map((p) => p.team_id),
    ...fixtures.flatMap((f) => [f.home_team_id, f.away_team_id]),
  ]));
  const nameById = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teamRows } = await db.from('pm_teams').select('id,name').in('id', teamIds);
    for (const row of (teamRows ?? []) as { id: string; name: string }[]) nameById.set(row.id, row.name);
  }
  const teamName = (id: string) => nameById.get(id) ?? 'უცნობი';

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1100px] space-y-4">
        <PmCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/playmanager" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]">
              <ArrowLeft className="h-4 w-4" /> უკან
            </Link>
            {team ? (
              <PmPill tone="green">{team.name} · D{team.division_id}</PmPill>
            ) : null}
          </div>
          <PmCardHead icon={Trophy} title="ჩემპიონატები" subtitle="championships" tone="green" />
          <p className="max-w-2xl text-sm font-bold leading-6 text-white/50">
            ნამდვილ მენეჯერებთან round-robin ლიგები. დარეგისტრირდი, დაელოდე დაწყებას — მატჩები დროთა განმავლობაში ავტომატურად თამაშდება.
          </p>
        </PmCard>

        {isAdmin ? <CreateLeagueForm /> : null}

        {leagues.length === 0 ? (
          <PmCard className="text-center">
            <p className="text-sm font-bold text-white/50">ჯერ ჩემპიონატი არ შექმნილა.</p>
          </PmCard>
        ) : null}

        {leagues.map((league) => {
          const parts = participants.filter((p) => p.league_id === league.id);
          const standings = [...parts].sort((a, b) =>
            b.points - a.points
            || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)
            || b.goals_for - a.goals_for,
          );
          const fix = fixtures.filter((f) => f.league_id === league.id);
          const joined = team ? parts.some((p) => p.team_id === team.id) : false;
          const full = parts.length >= league.max_teams;
          const meta = STATUS_META[league.status];

          return (
            <PmCard key={league.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">{league.name}</h2>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                    {league.format === 'knockout' ? 'ევრო ტურნირი' : 'ჩემპიონატი'} · დივიზიონი {DIV_LABEL[league.division_level] ?? league.division_level} · {parts.length}/{league.max_teams} გუნდი · პრიზი {league.prize_pool.toLocaleString('ka-GE')} ₾
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PmPill tone={meta.tone}>{meta.label}</PmPill>
                  {league.status === 'registration' && team && !joined && !full ? <JoinLeagueButton leagueId={league.id} /> : null}
                  {league.status === 'registration' && isAdmin ? <StartLeagueButton leagueId={league.id} /> : null}
                </div>
              </div>

              {league.status !== 'registration' && league.format === 'round_robin' && standings.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-[0.12em] text-white/38">
                        <th className="px-2 py-1.5">#</th>
                        <th className="px-2 py-1.5">გუნდი</th>
                        <th className="px-2 py-1.5 text-center">თ</th>
                        <th className="px-2 py-1.5 text-center">მ-ფ-წ</th>
                        <th className="px-2 py-1.5 text-center">სხვ.</th>
                        <th className="px-2 py-1.5 text-center">ქ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((p, i) => {
                        const done = league.status === 'completed';
                        const promoted = done && i === 0 && standings.length >= 2;
                        const relegated = done && i === standings.length - 1 && standings.length >= 2;
                        return (
                        <tr key={p.team_id} className={`border-t border-white/6 ${team && p.team_id === team.id ? 'bg-emerald-400/[0.08]' : ''}`}>
                          <td className="px-2 py-1.5 font-black text-white/50">
                            {i + 1}
                            {promoted ? <span title="ახვევა" className="ml-1 text-emerald-400">🔼</span> : null}
                            {relegated ? <span title="ჩავარდნა" className="ml-1 text-red-400">🔽</span> : null}
                          </td>
                          <td className="px-2 py-1.5 font-black text-white">{teamName(p.team_id)}</td>
                          <td className="px-2 py-1.5 text-center text-white/70">{p.played}</td>
                          <td className="px-2 py-1.5 text-center text-white/70">{p.won}-{p.drawn}-{p.lost}</td>
                          <td className="px-2 py-1.5 text-center text-white/70">{p.goals_for - p.goals_against >= 0 ? '+' : ''}{p.goals_for - p.goals_against}</td>
                          <td className="px-2 py-1.5 text-center font-black text-emerald-100">{p.points}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {league.status === 'registration' && parts.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {parts.map((p) => (
                    <PmPill key={p.team_id}>{teamName(p.team_id)}</PmPill>
                  ))}
                </div>
              ) : null}

              {fix.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">ფიქსტურები</p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {fix.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-white/6 bg-black/24 px-3 py-1.5 text-xs">
                        <span className="truncate font-bold text-white/72">{teamName(f.home_team_id)}</span>
                        <span className="shrink-0 font-black tabular-nums text-white">
                          {f.status === 'completed' ? `${f.home_goals}-${f.away_goals}` : 'vs'}
                        </span>
                        <span className="truncate text-right font-bold text-white/72">{teamName(f.away_team_id)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </PmCard>
          );
        })}
      </div>
    </PlayManagerLightShell>
  );
}
