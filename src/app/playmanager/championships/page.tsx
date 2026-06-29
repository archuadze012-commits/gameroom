import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
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
const STATUS_META: Record<string, { label: string; tone: string }> = {
  registration: { label: 'რეგისტრაცია', tone: 'border-emerald-300/24 bg-emerald-300/10 text-emerald-100' },
  in_progress: { label: 'მიმდინარე', tone: 'border-amber-300/24 bg-amber-300/10 text-amber-100' },
  completed: { label: 'დასრულდა', tone: 'border-white/14 bg-white/[0.05] text-white/60' },
};

export default async function ChampionshipsPage() {
  // Lazy: simulate any league fixtures whose kickoff time has passed.
  await processDueLeagueMatches();

  const db = (await createSupabaseServerClient()) as unknown as {
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
    from: (t: string) => any;
  };
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) redirect('/auth/login?next=/playmanager/championships');

  const team = await getTeam(userData.user.id);
  const isAdmin = await hasPermission('manage_content');

  const [{ data: leagueRows }, { data: participantRows }, { data: fixtureRows }] = await Promise.all([
    db.from('pm_league_instances').select('id,name,division_level,status,format,max_teams,prize_pool').order('created_at', { ascending: false }),
    db.from('pm_league_participants').select('league_id,team_id,played,won,drawn,lost,goals_for,goals_against,points'),
    db.from('pm_league_fixtures').select('league_id,round,home_team_id,away_team_id,home_goals,away_goals,status').order('round', { ascending: true }),
  ]);

  const leagues = (leagueRows ?? []) as LeagueRow[];
  const participants = (participantRows ?? []) as ParticipantRow[];
  const fixtures = (fixtureRows ?? []) as FixtureRow[];

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
        <SpotlightCard fillHeight={false} className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,22,16,0.94),rgba(4,8,6,0.98))] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/playmanager" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]">
              <ArrowLeft className="h-4 w-4" /> უკან
            </Link>
            {team ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-black text-emerald-100">
                {team.name} · D{team.division_id}
              </span>
            ) : null}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-300/24 bg-amber-300/12 text-amber-100">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">championships</p>
              <h1 className="text-3xl font-black text-white">ჩემპიონატები</h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/50">
            ნამდვილ მენეჯერებთან round-robin ლიგები. დარეგისტრირდი, დაელოდე დაწყებას — მატჩები დროთა განმავლობაში ავტომატურად თამაშდება.
          </p>
        </SpotlightCard>

        {isAdmin ? <CreateLeagueForm /> : null}

        {leagues.length === 0 ? (
          <SpotlightCard fillHeight={false} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-8 text-center">
            <p className="text-sm font-bold text-white/50">ჯერ ჩემპიონატი არ შექმნილა.</p>
          </SpotlightCard>
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
            <SpotlightCard key={league.id} fillHeight={false} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">{league.name}</h2>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                    {league.format === 'knockout' ? 'ევრო ტურნირი' : 'ჩემპიონატი'} · დივიზიონი {DIV_LABEL[league.division_level] ?? league.division_level} · {parts.length}/{league.max_teams} გუნდი · პრიზი {league.prize_pool.toLocaleString('ka-GE')} ₾
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${meta.tone}`}>{meta.label}</span>
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
                        <tr key={p.team_id} className={`border-t border-white/6 ${team && p.team_id === team.id ? 'bg-emerald-300/[0.06]' : ''}`}>
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
                    <span key={p.team_id} className="rounded-lg border border-white/8 bg-black/24 px-2.5 py-1 text-xs font-black text-white/70">{teamName(p.team_id)}</span>
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
            </SpotlightCard>
          );
        })}
      </div>
    </PlayManagerLightShell>
  );
}
