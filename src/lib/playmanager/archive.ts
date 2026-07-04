import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatGel } from '@/lib/playmanager/economy';

export type ArchiveMatch = {
  id: string;
  competition: 'league' | 'cup';
  competitionName: string;
  round: number;
  opponent: string;
  venue: 'Home' | 'Away' | null;
  score: string;
  result: 'W' | 'D' | 'L';
  incomeLabel: string | null;
  attendanceLabel: string | null;
  date: string;
};

export type Trophy = {
  id: string;
  kind: 'cup' | 'league';
  title: string;
  subtitle: string;
  date: string;
  prizeLabel: string | null;
  accent: 'gold' | 'green';
};

function firstRel(rel: unknown): Record<string, unknown> | null {
  if (Array.isArray(rel)) return (rel[0] as Record<string, unknown>) ?? null;
  return (rel as Record<string, unknown>) ?? null;
}

function relName(rel: unknown): string | null {
  const value = firstRel(rel);
  return (value?.name as string | undefined) ?? null;
}

function fmtInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function isoDate(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

type LeagueHistoryRow = {
  id: number;
  round_no: number;
  opponent_name: string;
  venue: 'Home' | 'Away' | null;
  scored: number;
  conceded: number;
  result: 'W' | 'D' | 'L';
  attendance: number;
  income: number;
  created_at: string;
};

type NameRel = { name: string } | { name: string }[] | null;

type CupHistoryRow = {
  id: string;
  round: number;
  score1: number | null;
  score2: number | null;
  winner_id: string | null;
  status: string;
  completed_at: string | null;
  team1_id: string | null;
  team2_id: string | null;
  pm_cup_instances: { pm_cup_templates: NameRel } | { pm_cup_templates: NameRel }[];
  team1: NameRel;
  team2: NameRel;
};

export async function getPlayManagerMatchArchive(teamId: string): Promise<ArchiveMatch[]> {
  const db = createSupabaseAdminClient();

  const [leagueRes, cupRes] = await Promise.all([
    db
      .from('pm_match_history')
      .select('id, round_no, opponent_name, venue, scored, conceded, result, attendance, income, created_at')
      .eq('team_id', teamId)
      .order('round_no', { ascending: false })
      .returns<LeagueHistoryRow[]>(),
    db
      .from('pm_cup_matches')
      .select(
        'id, round, score1, score2, winner_id, status, completed_at, team1_id, team2_id, ' +
          'pm_cup_instances!inner(template_id, pm_cup_templates(name)), ' +
          'team1:pm_teams!team1_id(name), team2:pm_teams!team2_id(name)',
      )
      .eq('status', 'completed')
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .order('completed_at', { ascending: false })
      .returns<CupHistoryRow[]>(),
  ]);

  const leagueMatches: ArchiveMatch[] = (leagueRes.data || []).map((m) => ({
    id: `league-${m.id}`,
    competition: 'league',
    competitionName: 'ლიგა',
    round: m.round_no,
    opponent: m.opponent_name,
    venue: m.venue,
    score: `${m.scored}-${m.conceded}`,
    result: m.result,
    incomeLabel: m.income > 0 ? formatGel(m.income) : null,
    attendanceLabel: m.attendance > 0 ? fmtInt(m.attendance) : null,
    date: isoDate(m.created_at),
  }));

  const cupMatches: ArchiveMatch[] = (cupRes.data || []).map((m) => {
    const isTeam1 = m.team1_id === teamId;
    const myScore = (isTeam1 ? m.score1 : m.score2) ?? 0;
    const oppScore = (isTeam1 ? m.score2 : m.score1) ?? 0;
    const opponent = (isTeam1 ? relName(m.team2) : relName(m.team1)) ?? 'უცნობი';
    const result: 'W' | 'D' | 'L' = m.winner_id === teamId ? 'W' : myScore === oppScore ? 'D' : 'L';
    const instance = firstRel(m.pm_cup_instances);
    return {
      id: `cup-${m.id}`,
      competition: 'cup',
      competitionName: relName(instance?.pm_cup_templates) ?? 'თასი',
      round: m.round,
      opponent,
      venue: null,
      score: `${myScore}-${oppScore}`,
      result,
      incomeLabel: null,
      attendanceLabel: null,
      date: isoDate(m.completed_at),
    };
  });

  return [...leagueMatches, ...cupMatches].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.round - a.round,
  );
}

type TemplateRel = { name: string; prize_pool: number } | { name: string; prize_pool: number }[] | null;

type WonCupRow = {
  cup_instance_id: string | null;
  round: number;
  completed_at: string | null;
  pm_cup_instances: { pm_cup_templates: TemplateRel } | { pm_cup_templates: TemplateRel }[];
};

type CupRoundRow = {
  cup_instance_id: string | null;
  round: number;
};

export async function getPlayManagerTrophyRoom(teamId: string): Promise<Trophy[]> {
  const db = createSupabaseAdminClient();

  const { data: won } = await db
    .from('pm_cup_matches')
    .select(
      'cup_instance_id, round, completed_at, ' +
        'pm_cup_instances!inner(status, template_id, pm_cup_templates(name, prize_pool))',
    )
    .eq('winner_id', teamId)
    .eq('pm_cup_instances.status', 'completed')
    .returns<WonCupRow[]>();

  const wonRows = won ?? [];
  const instanceIds = [...new Set(wonRows.map((r) => r.cup_instance_id).filter((id): id is string => id !== null))];

  const maxRoundByInstance: Record<string, number> = {};
  if (instanceIds.length > 0) {
    const { data: allRounds } = await db
      .from('pm_cup_matches')
      .select('cup_instance_id, round')
      .in('cup_instance_id', instanceIds)
      .returns<CupRoundRow[]>();
    for (const r of allRounds ?? []) {
      if (!r.cup_instance_id) continue;
      maxRoundByInstance[r.cup_instance_id] = Math.max(maxRoundByInstance[r.cup_instance_id] ?? 0, r.round);
    }
  }

  const cupTrophies: Trophy[] = wonRows
    .filter((r) => r.round === maxRoundByInstance[r.cup_instance_id as string])
    .map((r) => {
      const tmpl = firstRel(firstRel(r.pm_cup_instances)?.pm_cup_templates);
      const prizePool = tmpl?.prize_pool as number | undefined;
      return {
        id: `cup-${r.cup_instance_id}`,
        kind: 'cup' as const,
        title: (tmpl?.name as string | undefined) ?? 'თასი',
        subtitle: 'ჩემპიონი',
        date: isoDate(r.completed_at),
        prizeLabel: prizePool && prizePool > 0 ? formatGel(prizePool) : null,
        accent: 'gold' as const,
      };
    });

  const { data: season } = await db
    .from('pm_season_state')
    .select('season_no, last_finish, last_outcome, last_reward, updated_at')
    .eq('team_id', teamId)
    .maybeSingle();

  const seasonTrophies: Trophy[] = [];
  if (season && (season.last_finish === 1 || season.last_outcome === 'promoted')) {
    seasonTrophies.push({
      id: `season-${season.season_no}`,
      kind: 'league',
      title:
        season.last_finish === 1
          ? `სეზონი ${season.season_no} · ჩემპიონი`
          : `სეზონი ${season.season_no} · დაწინაურება`,
      subtitle: season.last_outcome === 'promoted' ? 'მაღალ დივიზიონში ავიდა' : `#${season.last_finish} ადგილი`,
      date: isoDate(season.updated_at),
      prizeLabel: season.last_reward > 0 ? formatGel(season.last_reward) : null,
      accent: 'green',
    });
  }

  return [...cupTrophies, ...seasonTrophies].sort((a, b) => (a.date < b.date ? 1 : -1));
}
