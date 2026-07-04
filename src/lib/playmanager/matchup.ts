import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Manager↔manager "matchup memory": on-pitch meetings (league + cup) and
// transfer deals between two specific clubs, from teamA's point of view.

export type MatchupMeeting = {
  id: string;
  competition: 'league' | 'cup';
  date: string | null;
  goalsFor: number;
  goalsAgainst: number;
  result: 'W' | 'D' | 'L';
};

export type MatchupTransfer = {
  id: string;
  playerName: string;
  price: number;
  direction: 'bought' | 'sold';
  createdAt: string;
};

export type MatchupHistory = {
  record: { wins: number; draws: number; losses: number };
  meetings: MatchupMeeting[];
  transfers: MatchupTransfer[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

const PAIR_ROW_LIMIT = 50;
const MEETINGS_DISPLAY_LIMIT = 8;
const TRANSFERS_DISPLAY_LIMIT = 8;

function pairFilter(column1: string, column2: string, a: string, b: string) {
  return `and(${column1}.eq.${a},${column2}.eq.${b}),and(${column1}.eq.${b},${column2}.eq.${a})`;
}

export async function getManagerMatchupHistory(teamAId: string, teamBId: string): Promise<MatchupHistory> {
  const admin = createSupabaseAdminClient() as Loose;

  const [{ data: leagueRows }, { data: cupRows }, { data: ledgerRows }] = await Promise.all([
    admin
      .from('pm_league_fixtures')
      .select('id, home_team_id, away_team_id, home_goals, away_goals, played_at')
      .eq('status', 'completed')
      .or(pairFilter('home_team_id', 'away_team_id', teamAId, teamBId))
      .order('played_at', { ascending: false })
      .limit(PAIR_ROW_LIMIT),
    admin
      .from('pm_cup_matches')
      .select('id, team1_id, team2_id, score1, score2, start_time')
      .eq('status', 'completed')
      .or(pairFilter('team1_id', 'team2_id', teamAId, teamBId))
      .order('start_time', { ascending: false })
      .limit(PAIR_ROW_LIMIT),
    admin
      .from('pm_transfer_ledger')
      .select('id, seller_team_id, buyer_team_id, price, created_at, player:pm_players(display_name, normalized_name)')
      .or(pairFilter('seller_team_id', 'buyer_team_id', teamAId, teamBId))
      .order('created_at', { ascending: false })
      .limit(PAIR_ROW_LIMIT),
  ]);

  const leagueMeetings: MatchupMeeting[] = ((leagueRows ?? []) as Loose[]).map((row) => {
    const isHome = row.home_team_id === teamAId;
    const goalsFor = Number(isHome ? row.home_goals : row.away_goals) || 0;
    const goalsAgainst = Number(isHome ? row.away_goals : row.home_goals) || 0;
    return {
      id: `league:${row.id}`,
      competition: 'league' as const,
      date: row.played_at,
      goalsFor,
      goalsAgainst,
      result: goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D',
    };
  });

  const cupMeetings: MatchupMeeting[] = ((cupRows ?? []) as Loose[]).map((row) => {
    const isTeam1 = row.team1_id === teamAId;
    const goalsFor = Number(isTeam1 ? row.score1 : row.score2) || 0;
    const goalsAgainst = Number(isTeam1 ? row.score2 : row.score1) || 0;
    return {
      id: `cup:${row.id}`,
      competition: 'cup' as const,
      date: row.start_time,
      goalsFor,
      goalsAgainst,
      result: goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D',
    };
  });

  const meetings = [...leagueMeetings, ...cupMeetings].sort((left, right) => {
    const rightTime = right.date ? new Date(right.date).getTime() : 0;
    const leftTime = left.date ? new Date(left.date).getTime() : 0;
    return rightTime - leftTime;
  });

  const record = meetings.reduce(
    (acc, meeting) => {
      if (meeting.result === 'W') acc.wins += 1;
      else if (meeting.result === 'L') acc.losses += 1;
      else acc.draws += 1;
      return acc;
    },
    { wins: 0, draws: 0, losses: 0 },
  );

  const transfers: MatchupTransfer[] = ((ledgerRows ?? []) as Loose[]).map((row) => {
    const player = Array.isArray(row.player) ? row.player[0] : row.player;
    return {
      id: row.id,
      playerName: player?.display_name || player?.normalized_name || 'ფეხბურთელი',
      price: Number(row.price ?? 0),
      direction: row.buyer_team_id === teamAId ? ('bought' as const) : ('sold' as const),
      createdAt: row.created_at,
    };
  });

  return {
    record,
    meetings: meetings.slice(0, MEETINGS_DISPLAY_LIMIT),
    transfers: transfers.slice(0, TRANSFERS_DISPLAY_LIMIT),
  };
}
