import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  CalendarClock,
  ChevronLeft,
  CircleCheck,
  Clock3,
  Trophy,
} from 'lucide-react';
import {
  CupMatchLineupWorkbench,
  type CupWorkbenchPlayer,
  type CupWorkbenchSettings,
  type CupWorkbenchTeam,
} from '@/components/playmanager/cup-match-lineup-workbench';
import { CupMatchCountdown } from '@/components/playmanager/cup-match-countdown';
import { formatGel } from '@/lib/playmanager/economy';
import { processDueCupMatches } from '@/lib/playmanager/cups';
import { getTeam } from '@/lib/playmanager/team';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';

export const dynamic = 'force-dynamic';

type DbMatchSettings = {
  tactical_style: 'balanced' | 'pressing' | 'possession' | 'counter';
  defensive_line: 'low' | 'mid' | 'high';
  tempo: 'controlled' | 'balanced' | 'direct';
  focus_side: 'left' | 'center' | 'right';
};

type TeamRef = {
  id: string;
  name: string;
  user_id: string | null;
  is_bot: boolean | null;
} | null;

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string;
  avatar_url: string | null;
};

type CupMatchRow = {
  id: string;
  cup_instance_id: string;
  round: number;
  position: number;
  status: 'pending' | 'ready' | 'live' | 'completed';
  start_time: string | null;
  score1: number | null;
  score2: number | null;
  winner_id: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1: TeamRef | TeamRef[];
  team2: TeamRef | TeamRef[];
  pm_cup_instances:
    | {
        id: string;
        template_id: string;
        status: string;
        pm_cup_templates:
          | {
              id: string;
              name: string;
              prize_pool: number;
              entry_fee: number;
            }
          | Array<{
              id: string;
              name: string;
              prize_pool: number;
              entry_fee: number;
            }>
          | null;
      }
    | Array<{
        id: string;
        template_id: string;
        status: string;
        pm_cup_templates:
          | {
              id: string;
              name: string;
              prize_pool: number;
              entry_fee: number;
            }
          | Array<{
              id: string;
              name: string;
              prize_pool: number;
              entry_fee: number;
            }>
          | null;
      }>
    | null;
};

type SquadPreviewRow = {
  id: number;
  team_id: string;
  shirt_number: number | null;
  position: string;
  player:
    | {
        id: string;
        display_name: string;
        ovr_current: number | null;
        fatigue: number | null;
        morale: number | null;
        injury_matches: number | null;
        status: string | null;
        talent: number | null;
      }
    | Array<{
        id: string;
        display_name: string;
        ovr_current: number | null;
        fatigue: number | null;
        morale: number | null;
        injury_matches: number | null;
        status: string | null;
        talent: number | null;
      }>
    | null;
};

type MatchSettingsRow = DbMatchSettings & {
  team_id: string;
};

type LooseQuery = {
  select: (columns: string) => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  in: (column: string, values: readonly unknown[]) => LooseQuery;
  order: (column: string, options?: { ascending?: boolean }) => LooseQuery;
  single: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
  returns: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
};

type PlayManagerLooseDb = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  from: (table: string) => LooseQuery;
};

const DEFAULT_SETTINGS: CupWorkbenchSettings = {
  tacticalStyle: 'balanced',
  defensiveLine: 'mid',
  tempo: 'balanced',
  focusSide: 'center',
};

export default async function CupMatchPage(
  props: { params: Promise<{ id: string; matchId: string }> },
) {
  const params = await props.params;
  await processDueCupMatches();

  const db = (await createSupabaseServerClient()) as unknown as PlayManagerLooseDb;

  const { data: userData } = await db.auth.getUser();
  if (!userData.user) {
    redirect('/auth/login');
  }

  const teamData = await getTeam(userData.user.id);
  if (!teamData) {
    redirect('/playmanager');
  }

  const { data: match } = await db
    .from('pm_cup_matches')
    .select(`
      id,
      cup_instance_id,
      round,
      position,
      status,
      start_time,
      score1,
      score2,
      winner_id,
      team1_id,
      team2_id,
      team1:pm_teams!team1_id(id, name, user_id, is_bot),
      team2:pm_teams!team2_id(id, name, user_id, is_bot),
      pm_cup_instances (
        id,
        template_id,
        status,
        pm_cup_templates ( id, name, prize_pool, entry_fee )
      )
    `)
    .eq('id', params.matchId)
    .single<CupMatchRow>();

  const cupInstance = firstRelation(match?.pm_cup_instances);
  const cupTemplate = firstRelation(cupInstance?.pm_cup_templates);

  if (!match || cupInstance?.template_id !== params.id) {
    return (
      <EmptyMatchState
        href={`/playmanager/cups/${params.id}`}
        title="მატჩი ვერ მოიძებნა"
        description="ეს მატჩი ამ თასს არ ეკუთვნის ან წაშლილია."
      />
    );
  }

  const isParticipant = match.team1_id === teamData.id || match.team2_id === teamData.id;
  if (!isParticipant) {
    redirect(`/playmanager/cups/${params.id}`);
  }

  const team1 = firstRelation(match.team1);
  const team2 = firstRelation(match.team2);

  if (!match.team1_id || !match.team2_id || !team1 || !team2) {
    return (
      <EmptyMatchState
        href={`/playmanager/cups/${params.id}`}
        title="მატჩი ჯერ არ არის დაწყვილებული"
        description="ლაინაფის preview გამოჩნდება ორივე გუნდის ცნობილი გახდომის შემდეგ."
      />
    );
  }

  const teamIds = [match.team1_id, match.team2_id];
  const managerIds = [team1.user_id, team2.user_id].filter((id): id is string => Boolean(id));
  const [{ data: squadRows }, { data: settingRows }, { data: profileRows }] = await Promise.all([
    db
      .from('pm_squads')
      .select('id, team_id, shirt_number, position, player:pm_players(id, display_name, ovr_current, fatigue, morale, injury_matches, status, talent)')
      .in('team_id', teamIds)
      .order('id', { ascending: true })
      .returns<SquadPreviewRow[]>(),
    db
      .from('pm_match_settings')
      .select('team_id, tactical_style, defensive_line, tempo, focus_side')
      .in('team_id', teamIds)
      .returns<MatchSettingsRow[]>(),
    managerIds.length > 0
      ? db
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', managerIds)
          .returns<ProfileRow[]>()
      : Promise.resolve({ data: [] as ProfileRow[] }),
  ]);

  const settingsByTeam = new Map<string, CupWorkbenchSettings>();
  for (const row of settingRows || []) {
    settingsByTeam.set(row.team_id, {
      tacticalStyle: row.tactical_style ?? DEFAULT_SETTINGS.tacticalStyle,
      defensiveLine: row.defensive_line ?? DEFAULT_SETTINGS.defensiveLine,
      tempo: row.tempo ?? DEFAULT_SETTINGS.tempo,
      focusSide: row.focus_side ?? DEFAULT_SETTINGS.focusSide,
    });
  }

  const profilesByUser = new Map((profileRows || []).map((profile) => [profile.id, profile]));
  const homePreview = buildTeamPreview({
    id: match.team1_id,
    name: team1.name,
    squadRows: squadRows || [],
    settings: settingsByTeam.get(match.team1_id) ?? DEFAULT_SETTINGS,
  });
  const awayPreview = buildTeamPreview({
    id: match.team2_id,
    name: team2.name,
    squadRows: squadRows || [],
    settings: settingsByTeam.get(match.team2_id) ?? DEFAULT_SETTINGS,
  });

  const ownPreview = homePreview.id === teamData.id ? homePreview : awayPreview;
  const opponentPreview = homePreview.id === teamData.id ? awayPreview : homePreview;
  const scoutingTips = getScoutingTips(opponentPreview, ownPreview);
  const isCompleted = match.status === 'completed';
  const startLabel = formatStartTime(match.start_time);

  return (
    <PlayManagerLightShell>
      <section className="relative overflow-hidden rounded-xl bg-[#020806]/90 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,197,94,0.22),transparent_30%),radial-gradient(circle_at_85%_26%,rgba(127,29,29,0.26),transparent_34%),linear-gradient(135deg,rgba(2,18,10,0.98),rgba(0,0,0,0.98)_58%,rgba(23,7,7,0.94))]" />
        <div className="relative z-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Link
              href={`/playmanager/cups/${params.id}`}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-300/18 bg-black/44 text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-300/10"
              aria-label="უკან დაბრუნება"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/42 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
              <CalendarClock className="h-4 w-4" />
              {cupTemplate?.name || 'თასი'} · Round {match.round} · {startLabel}
            </div>
          </div>

          <MatchHero
            home={homePreview}
            away={awayPreview}
            homeProfile={team1.user_id ? profilesByUser.get(team1.user_id) ?? null : null}
            awayProfile={team2.user_id ? profilesByUser.get(team2.user_id) ?? null : null}
            score1={match.score1}
            score2={match.score2}
            isCompleted={isCompleted}
            startTime={match.start_time}
            prizePool={cupTemplate?.prize_pool ?? 0}
          />

          <CupMatchLineupWorkbench
            own={ownPreview}
            opponent={opponentPreview}
            tips={scoutingTips}
            canEdit={!isCompleted}
          />
        </div>
      </section>
    </PlayManagerLightShell>
  );
}

function MatchHero({
  home,
  away,
  homeProfile,
  awayProfile,
  score1,
  score2,
  isCompleted,
  startTime,
  prizePool,
}: {
  home: CupWorkbenchTeam;
  away: CupWorkbenchTeam;
  homeProfile: ProfileRow | null;
  awayProfile: ProfileRow | null;
  score1: number | null;
  score2: number | null;
  isCompleted: boolean;
  startTime: string | null;
  prizePool: number;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-[30px] border border-white/10 bg-black/50 shadow-[inset_0_0_60px_rgba(34,197,94,0.08)]">
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)]">
        <FaceoffTeam team={home} profile={homeProfile} side="home" />
        <div className="flex flex-col items-center justify-center border-y border-white/10 bg-[radial-gradient(circle_at_50%_30%,rgba(34,197,94,0.2),transparent_40%),rgba(0,0,0,0.42)] p-5 text-center lg:border-x lg:border-y-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/62">Match center</p>
          <div className="mt-3 text-5xl font-black text-white">
            {isCompleted ? `${score1 ?? 0} : ${score2 ?? 0}` : startTime ? <CupMatchCountdown startTime={startTime} /> : 'Ready'}
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
            {isCompleted ? <CircleCheck className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            {isCompleted ? 'Final score' : 'Kickoff timer'}
          </p>
          <div className="mt-5 rounded-2xl border border-emerald-200/18 bg-emerald-300/8 px-4 py-2 text-sm font-black text-emerald-100">
            <Trophy className="mr-2 inline h-4 w-4" />
            {formatGel(prizePool)}
          </div>
        </div>
        <FaceoffTeam team={away} profile={awayProfile} side="away" />
      </div>
    </div>
  );
}

function FaceoffTeam({
  team,
  profile,
  side,
}: {
  team: CupWorkbenchTeam;
  profile: ProfileRow | null;
  side: 'home' | 'away';
}) {
  const managerName = profile?.display_name || profile?.username || 'AI Manager';

  return (
    <div className={`relative p-5 ${side === 'away' ? 'lg:text-right' : ''}`}>
      <div className={`flex items-center gap-4 ${side === 'away' ? 'lg:flex-row-reverse' : ''}`}>
        <TeamCrest name={team.name} tone={side === 'home' ? 'green' : 'red'} />
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${side === 'home' ? 'text-emerald-200/62' : 'text-red-200/62'}`}>
            {side === 'home' ? 'Home club' : 'Away club'}
          </p>
          <h1 className="mt-2 truncate text-3xl font-black text-white sm:text-4xl">{team.name}</h1>
          <div className={`mt-3 flex items-center gap-2 ${side === 'away' ? 'lg:justify-end' : ''}`}>
            <ManagerAvatar profile={profile} />
            <span className="min-w-0 truncate text-sm font-black text-white/58">{managerName}</span>
          </div>
        </div>
      </div>
      <div className={`mt-5 grid grid-cols-3 gap-2 ${side === 'away' ? 'lg:text-right' : ''}`}>
        <HeroMetric label="OVR" value={String(team.avgOvr)} />
        <HeroMetric label="მორალი" value={`${team.avgMorale}%`} />
        <HeroMetric label="დაღლა" value={`${team.avgFatigue}%`} />
      </div>
    </div>
  );
}

function TeamCrest({ name, tone }: { name: string; tone: 'green' | 'red' }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const classes =
    tone === 'green'
      ? 'border-emerald-200/28 bg-emerald-300/12 text-emerald-100 shadow-[0_0_30px_rgba(52,211,153,0.16)]'
      : 'border-red-200/24 bg-red-400/12 text-red-100 shadow-[0_0_30px_rgba(248,113,113,0.12)]';

  return (
    <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-[24px] border text-2xl font-black ${classes}`}>
      {initials || 'FC'}
    </div>
  );
}

function ManagerAvatar({ profile }: { profile: ProfileRow | null }) {
  const label = profile?.display_name || profile?.username || 'AI';
  if (profile?.avatar_url) {
    return (
      <span
        aria-label={label}
        role="img"
        className="block h-9 w-9 rounded-full border border-white/14 bg-cover bg-center"
        style={{ backgroundImage: `url(${profile.avatar_url})` }}
      />
    );
  }

  return (
    <span className="grid h-9 w-9 place-items-center rounded-full border border-white/14 bg-white/[0.06] text-xs font-black text-white/58">
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">{label}</p>
      <strong className="text-sm font-black text-white">{value}</strong>
    </div>
  );
}

function EmptyMatchState({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center text-center text-white/50">
      <Trophy className="mb-4 h-12 w-12 opacity-50" />
      <h1 className="text-xl font-black text-white">{title}</h1>
      <p className="mt-2 max-w-md text-sm">{description}</p>
      <Link href={href} className="mt-4 text-emerald-400 hover:underline">
        უკან დაბრუნება
      </Link>
    </div>
  );
}

function buildTeamPreview({
  id,
  name,
  squadRows,
  settings,
}: {
  id: string;
  name: string;
  squadRows: SquadPreviewRow[];
  settings: CupWorkbenchSettings;
}): CupWorkbenchTeam {
  const players = squadRows
    .filter((row) => row.team_id === id && row.player)
    .map((row) => {
      const player = firstRelation(row.player);
      if (!player) return null;

      return {
        id: player.id,
        name: player.display_name,
        position: row.position,
        ovr: player.ovr_current ?? 50,
        fatigue: player.fatigue ?? 0,
        morale: player.morale ?? 50,
        injuryMatches: player.injury_matches ?? 0,
        availability: player.status === 'injured' ? 'injured' : 'ready',
        talent: player.talent ?? 5,
      } satisfies CupWorkbenchPlayer;
    })
    .filter((player): player is CupWorkbenchPlayer => player !== null)
    .sort((a, b) => {
      const left = squadRows.find((row) => firstRelation(row.player)?.id === a.id)?.shirt_number ?? 99;
      const right = squadRows.find((row) => firstRelation(row.player)?.id === b.id)?.shirt_number ?? 99;
      return left - right || b.ovr - a.ovr;
    });

  const starters = players.slice(0, 11);
  const bench = players.slice(11, 15);
  const reserves = players.slice(15);
  const avgOvr = average(starters.map((player) => player.ovr));
  const avgMorale = average(starters.map((player) => player.morale));
  const avgFatigue = average(starters.map((player) => player.fatigue));

  return {
    id,
    name,
    starters,
    bench,
    reserves,
    avgOvr,
    avgMorale,
    avgFatigue,
    injuredCount: players.filter((player) => player.availability === 'injured' || player.injuryMatches > 0).length,
    settings,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function getScoutingTips(opponent: CupWorkbenchTeam, own: CupWorkbenchTeam) {
  const tips: string[] = [];

  if (opponent.avgFatigue >= 60) {
    tips.push('მეტოქეს მაღალი დაღლა აქვს: ტემპი აუწიე და მეორე ტაიმში fresh bench გამოიყენე.');
  } else {
    tips.push('მეტოქე ფიზიკურად მზადაა: თავიდანვე ზედმეტად გახსნილი თამაში სარისკოა.');
  }

  if (opponent.settings.defensiveLine === 'high') {
    tips.push('მაღალი დაცვის ხაზი ჩანს: სწრაფი ფლანგები და direct/counter თამაში სივრცეს გახსნის.');
  } else if (opponent.settings.defensiveLine === 'low') {
    tips.push('დაბალი ბლოკის წინააღმდეგ possession და ცენტრიდან მოთმინებით შეტევა უკეთესია.');
  } else {
    tips.push('საშუალო დაცვის ხაზი აქვს: focus side აირჩიე იქ, სადაც შენი ყველაზე ძლიერი winger/CM თამაშობს.');
  }

  if (opponent.settings.tacticalStyle === 'pressing') {
    tips.push('პრესინგის წინააღმდეგ controlled tempo და მაღალი passing OVR მქონე ნახევარდაცვა აირჩიე.');
  } else if (opponent.settings.tacticalStyle === 'counter') {
    tips.push('კონტრშეტევას უფრთხილდი: defensive line ძალიან მაღლა არ აწიო.');
  }

  if (opponent.avgOvr >= own.avgOvr + 4) {
    tips.push('OVR სხვაობა მეტოქის მხარესაა: risk შეამცირე და set-piece/ფლანგის მომენტები ეძებე.');
  } else if (own.avgOvr >= opponent.avgOvr + 4) {
    tips.push('შენი გუნდი რეიტინგით წინ არის: ინიციატივა აიღე და tempo balanced/direct-ზე დატოვე.');
  }

  if (opponent.injuredCount > 0) {
    tips.push('მეტოქეს ტრავმების რისკი აქვს: კონკრეტულ სუსტ პოზიციაზე overload გააკეთე.');
  }

  return tips.slice(0, 5);
}

function formatStartTime(value: string | null) {
  if (!value) return 'დრო უცნობია';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'დრო უცნობია';

  return new Intl.DateTimeFormat('ka-GE', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(date);
}
