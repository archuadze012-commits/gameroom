import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// PlayManager achievements — an aspirational progression ladder. Definitions are
// static; progress is DERIVED from existing gameplay data at read time (no extra
// tables, no write RPCs). Display-only: an achievement is "unlocked" when its
// derived metric reaches the goal.

export type AchievementCategory = 'match' | 'squad' | 'economy' | 'progress';

export type AchievementMetric =
  | 'wins'
  | 'goals'
  | 'cleanSheets'
  | 'squadSize'
  | 'avgOvr'
  | 'hasLegend'
  | 'balance'
  | 'transfersSold'
  | 'level'
  | 'divisionA'
  | 'seasonNo';

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  goal: number;
};

export type AchievementProgress = AchievementDef & {
  current: number;
  unlocked: boolean;
  pct: number;
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  match: 'მატჩები',
  squad: 'შემადგენლობა',
  economy: 'ეკონომიკა',
  progress: 'პროგრესი',
};

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', title: 'პირველი გამარჯვება', description: 'მოიგე პირველი ოფიციალური მატჩი', category: 'match', metric: 'wins', goal: 1 },
  { id: 'wins_25', title: 'გამარჯვებული', description: 'მოაგროვე 25 გამარჯვება', category: 'match', metric: 'wins', goal: 25 },
  { id: 'goals_50', title: 'გოლების მანქანა', description: 'გაიტანე ჯამში 50 გოლი', category: 'match', metric: 'goals', goal: 50 },
  { id: 'clean_sheets_10', title: 'რკინის დაცვა', description: 'შეინახე 10 „მშრალი" მატჩი', category: 'match', metric: 'cleanSheets', goal: 10 },

  { id: 'squad_full', title: 'სრული როტაცია', description: 'იყოლიე 16 ფეხბურთელი', category: 'squad', metric: 'squadSize', goal: 16 },
  { id: 'avg_ovr_75', title: 'ვარსკვლავური შემადგენლობა', description: 'მიაღწიე გუნდის საშ. OVR 75-ს', category: 'squad', metric: 'avgOvr', goal: 75 },
  { id: 'sign_legend', title: 'ლეგენდის მოზიდვა', description: 'იყოლიე Talent 10+ ფეხბურთელი', category: 'squad', metric: 'hasLegend', goal: 1 },

  { id: 'balance_2m', title: 'ფინანსური იმპერია', description: 'დააგროვე 2 000 000 ₾ ბალანსზე', category: 'economy', metric: 'balance', goal: 2_000_000 },
  { id: 'transfers_sold_5', title: 'ჭკვიანი გამყიდველი', description: 'გაყიდე 5 ფეხბურთელი', category: 'economy', metric: 'transfersSold', goal: 5 },

  { id: 'level_10', title: 'გამოცდილი მენეჯერი', description: 'მიაღწიე მენეჯერის დონე 10-ს', category: 'progress', metric: 'level', goal: 10 },
  { id: 'division_a', title: 'ელიტა', description: 'ავიდი A დივიზიონში', category: 'progress', metric: 'divisionA', goal: 1 },
  { id: 'season_3', title: 'ვეტერანი', description: 'ითამაშე 3 სეზონი', category: 'progress', metric: 'seasonNo', goal: 3 },
];

export type AchievementMetrics = Record<AchievementMetric, number>;

export type AchievementsResult = {
  metrics: AchievementMetrics;
  achievements: AchievementProgress[];
  unlockedCount: number;
  total: number;
};

export async function getPlayManagerAchievements(teamId: string): Promise<AchievementsResult> {
  const db = createSupabaseAdminClient() as unknown as SupabaseLoose;

  const [teamRow, matchRes, squadRes, ownedRes, walletRes, seasonRes, sellsRes] = await Promise.all([
    db.from('pm_teams').select('division_id,user_id').eq('id', teamId).maybeSingle<{ division_id: number; user_id: string }>(),
    db.from('pm_match_history').select('scored,conceded,result').eq('team_id', teamId),
    db.from('pm_squads').select('id', { count: 'exact', head: true }).eq('team_id', teamId),
    db.from('pm_players').select('ovr_current,talent').eq('owner_id', teamId),
    db.from('pm_wallets').select('balance').eq('team_id', teamId).maybeSingle<{ balance: number }>(),
    db.from('pm_season_state').select('season_no').eq('team_id', teamId).maybeSingle<{ season_no: number }>(),
    db.from('pm_transactions').select('id', { count: 'exact', head: true }).eq('team_id', teamId).ilike('reason', 'transfer_sell%'),
  ]);

  const matches = (matchRes.data ?? []) as Array<{ scored: number; conceded: number; result: string }>;
  const owned = (ownedRes.data ?? []) as Array<{ ovr_current: number; talent: number }>;

  const wins = matches.filter((m) => m.result === 'W').length;
  const goals = matches.reduce((sum, m) => sum + (m.scored ?? 0), 0);
  const cleanSheets = matches.filter((m) => (m.conceded ?? 0) === 0).length;
  const squadSize = squadRes.count ?? 0;
  const avgOvr = owned.length ? Math.round(owned.reduce((sum, p) => sum + (p.ovr_current ?? 0), 0) / owned.length) : 0;
  const hasLegend = owned.some((p) => (p.talent ?? 0) >= 10) ? 1 : 0;
  const balance = walletRes.data?.balance ?? 0;
  const seasonNo = seasonRes.data?.season_no ?? 1;
  const divisionId = teamRow.data?.division_id ?? 5;
  const divisionA = divisionId <= 1 ? 1 : 0;
  const transfersSold = sellsRes.count ?? 0;

  let level = 1;
  if (teamRow.data?.user_id) {
    const profileRes = await db.from('profiles').select('level').eq('id', teamRow.data.user_id).maybeSingle<{ level: number }>();
    level = profileRes.data?.level ?? 1;
  }

  const metrics: AchievementMetrics = {
    wins,
    goals,
    cleanSheets,
    squadSize,
    avgOvr,
    hasLegend,
    balance,
    transfersSold,
    level,
    divisionA,
    seasonNo,
  };

  const achievements: AchievementProgress[] = ACHIEVEMENTS.map((def) => {
    const current = metrics[def.metric];
    const pct = Math.max(0, Math.min(100, Math.round((current / def.goal) * 100)));
    return { ...def, current, unlocked: current >= def.goal, pct };
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return { metrics, achievements, unlockedCount, total: achievements.length };
}

type SupabaseLoose = {
  from: (table: string) => {
    select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => LooseBuilder;
  };
};

type LooseBuilder = Promise<{ data: unknown; count: number | null }> & {
  eq: (column: string, value: unknown) => LooseBuilder & {
    maybeSingle: <T>() => Promise<{ data: T | null }>;
    ilike: (column: string, value: string) => LooseBuilder;
  };
};
