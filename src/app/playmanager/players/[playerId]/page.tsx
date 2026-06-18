import Link from 'next/link';
import {
  ArrowLeft,
  BadgeDollarSign,
  Dumbbell,
  Gauge,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRound,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import {
  PlayerFutCard,
} from '@/components/playmanager/player-fut-card';
import { derivePlayerStats } from '@/lib/playmanager/player-card-stats';
import { formatGel } from '@/lib/playmanager/economy';
import { ovrGrowthCap } from '@/lib/playmanager/players';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PlayerRow = {
  id: string;
  normalized_name: string;
  display_name: string;
  is_real: boolean;
  talent: number;
  ea_fc_ovr: number | null;
  ovr_source: string | null;
  ovr_base: number;
  ovr_current: number;
  base_transfer_value_gel: number;
  current_transfer_value_gel: number;
  age: number;
  fatigue: number;
  morale: number;
  injury_matches: number;
  status: string;
  owner_id: string | null;
  created_at: string;
};

type SquadRow = {
  id: string;
  team_id: string;
  shirt_number: number;
  position: string;
};

type TeamRow = {
  id: string;
  name: string;
  user_id: string | null;
  is_bot: boolean;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type LooseQuery = {
  select: (columns: string) => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  order: (column: string, options?: { ascending?: boolean }) => LooseQuery;
  limit: (count: number) => LooseQuery;
  single: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
  maybeSingle: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
  returns: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
};

type PlayManagerLooseDb = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  from: (table: string) => LooseQuery;
};

const STAT_LABELS: Record<string, string> = {
  PAC: 'სისწრაფე',
  SHO: 'დარტყმა',
  PAS: 'პასი',
  DRI: 'დრიბლინგი',
  DEF: 'დაცვა',
  PHY: 'ფიზიკა',
  DIV: 'ნახტომი',
  HAN: 'ხელები',
  KIC: 'გადაცემა',
  REF: 'რეაქცია',
  SPD: 'სისწრაფე',
  POS: 'პოზიცია',
};

const HASH_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'] as const;

function inferPosition(player: PlayerRow, squad: SquadRow | null): string {
  if (squad?.position) return squad.position;

  const name = `${player.normalized_name} ${player.display_name}`.toLowerCase();
  if (name.includes('mamardashvili') || name.includes('მამარდაშვილი')) return 'GK';
  if (name.includes('kvaratskhelia') || name.includes('კვარაცხელია')) return 'LW';
  if (name.includes('mikautadze') || name.includes('მიქაუტაძე')) return 'ST';

  let hash = 0;
  for (let index = 0; index < player.id.length; index += 1) {
    hash = (hash << 5) - hash + player.id.charCodeAt(index);
    hash |= 0;
  }
  return HASH_POSITIONS[Math.abs(hash) % HASH_POSITIONS.length] ?? 'CM';
}

function playerRole(squad: SquadRow | null): string {
  if (!squad) return 'თავისუფალი აგენტი';
  if (squad.shirt_number <= 11) return 'სასტარტო XI';
  if (squad.shirt_number <= 15) return 'სათადარიგო';
  return 'რეზერვი';
}

function playerCardRole(squad: SquadRow | null): 'starter' | 'bench' | 'reserve' | undefined {
  if (!squad) return undefined;
  if (squad.shirt_number <= 11) return 'starter';
  if (squad.shirt_number <= 15) return 'bench';
  return 'reserve';
}

function statusText(player: PlayerRow): { label: string; tone: string } {
  if (player.injury_matches > 0) {
    return {
      label: `ტრავმა: ${player.injury_matches} მატჩი`,
      tone: 'border-red-300/30 bg-red-500/10 text-red-100',
    };
  }
  if (player.status === 'injured') {
    return { label: 'ტრავმირებული', tone: 'border-red-300/30 bg-red-500/10 text-red-100' };
  }
  return { label: 'მზად არის', tone: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' };
}

function percent(value: number, max = 100): number {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export default async function PlayManagerPlayerPage(
  props: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await props.params;
  const db = (await createSupabaseServerClient()) as unknown as PlayManagerLooseDb;

  const { data: userData } = await db.auth.getUser();
  if (!userData.user) {
    redirect(`/auth/login?next=/playmanager/players/${playerId}`);
  }

  const { data: player } = await db
    .from('pm_players')
    .select(
      [
        'id',
        'normalized_name',
        'display_name',
        'is_real',
        'talent',
        'ea_fc_ovr',
        'ovr_source',
        'ovr_base',
        'ovr_current',
        'base_transfer_value_gel',
        'current_transfer_value_gel',
        'age',
        'fatigue',
        'morale',
        'injury_matches',
        'status',
        'owner_id',
        'created_at',
      ].join(','),
    )
    .eq('id', playerId)
    .maybeSingle<PlayerRow>();

  if (!player) {
    return <PlayerEmptyState />;
  }

  const { data: squadRows } = await db
    .from('pm_squads')
    .select('id,team_id,shirt_number,position')
    .eq('player_id', player.id)
    .order('shirt_number', { ascending: true })
    .limit(1)
    .returns<SquadRow[]>();
  const squad = squadRows?.[0] ?? null;

  const teamResult = squad
    ? await db
      .from('pm_teams')
      .select('id,name,user_id,is_bot')
      .eq('id', squad.team_id)
      .maybeSingle<TeamRow>()
    : { data: null };
  const team = teamResult.data;

  const profileResult = team?.user_id
    ? await db
      .from('profiles')
      .select('id,display_name,username,avatar_url')
      .eq('id', team.user_id)
      .maybeSingle<ProfileRow>()
    : { data: null };
  const manager = profileResult.data;

  const position = inferPosition(player, squad);
  const derivedStats = derivePlayerStats(position, player.ovr_current);
  const potential = Math.min(99, player.ovr_base + ovrGrowthCap(player.talent));
  const growth = player.ovr_current - player.ovr_base;
  const remainingGrowth = Math.max(0, potential - player.ovr_current);
  const growthPct = potential === player.ovr_base
    ? 100
    : percent(player.ovr_current - player.ovr_base, potential - player.ovr_base);
  const valueGrowth = player.current_transfer_value_gel - player.base_transfer_value_gel;
  const status = statusText(player);
  const managerName = manager?.display_name ?? manager?.username ?? (team?.is_bot ? 'AI Manager' : 'უცნობი მენეჯერი');

  return (
    <main className="pm-playmanager-page-env px-3 py-4 text-white sm:px-5 sm:py-6">
      <section className="pm-manager-env-width">
        <div className="pm-neon-frame relative overflow-hidden border border-emerald-300/18 bg-[#020806] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.62)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_82%_12%,rgba(248,113,113,0.12),transparent_28%)]" />
          <div className="relative">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/playmanager"
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-300/18 bg-black/44 px-4 text-sm font-black text-emerald-100 transition hover:border-emerald-200/42 hover:bg-emerald-300/10"
              >
                <ArrowLeft className="h-4 w-4" />
                ქალაქი
              </Link>
              <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${status.tone}`}>
                {status.label}
              </span>
            </div>

            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className="rounded-[28px] border border-emerald-300/16 bg-black/52 p-4 shadow-[inset_0_0_55px_rgba(16,185,129,0.08)]">
                <div className="mx-auto h-[497px] w-[360px] max-w-full overflow-hidden">
                  <div style={{ transform: 'scale(1.04)', transformOrigin: 'top left' }}>
                    <PlayerFutCard
                      name={player.display_name}
                      position={position}
                      ovr={player.ovr_current}
                      role={playerCardRole(squad)}
                      availability={player.injury_matches > 0 ? 'injured' : 'ready'}
                      talent={player.talent}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <div className="rounded-[30px] border border-emerald-300/16 bg-[linear-gradient(135deg,rgba(3,24,15,0.96),rgba(0,0,0,0.86)_52%,rgba(31,7,7,0.72))] p-5 shadow-[inset_0_0_55px_rgba(16,185,129,0.08)]">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200/60">
                    Player profile
                  </p>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h1 className="text-4xl font-black leading-none tracking-normal text-white sm:text-6xl">
                        {player.display_name}
                      </h1>
                      <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-white/46">
                        {team?.name ?? 'Free agent'} · {position} · {player.age} წლის
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <HeroMetric label="OVR" value={String(player.ovr_current)} icon={<Gauge className="h-4 w-4" />} />
                      <HeroMetric label="Potential" value={String(potential)} icon={<Sparkles className="h-4 w-4" />} />
                      <HeroMetric label="Talent" value={`${player.talent}/10`} icon={<Star className="h-4 w-4" />} />
                      <HeroMetric label="Role" value={playerRole(squad)} icon={<Trophy className="h-4 w-4" />} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <InfoTile
                    icon={<BadgeDollarSign className="h-5 w-5" />}
                    label="საბაზრო ფასი"
                    value={formatGel(player.current_transfer_value_gel)}
                    sub={`${signed(valueGrowth)} GEL საწყისთან შედარებით`}
                  />
                  <InfoTile
                    icon={<HeartPulse className="h-5 w-5" />}
                    label="მორალი"
                    value={`${player.morale}%`}
                    sub={player.morale >= 70 ? 'მენტალურად მზადაა' : 'მორალის აწევა სჭირდება'}
                  />
                  <InfoTile
                    icon={<Dumbbell className="h-5 w-5" />}
                    label="დაღლა"
                    value={`${player.fatigue}%`}
                    sub={player.fatigue >= 55 ? 'როტაცია გაითვალისწინე' : 'ფიზიკურად ნორმაშია'}
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <section className="rounded-[28px] border border-emerald-300/14 bg-black/50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/62">
                          Attributes
                        </p>
                        <h2 className="mt-1 text-xl font-black text-white">სათამაშო პროფილი</h2>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/50">
                        {position}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {derivedStats.map((stat) => (
                        <AttributeRow
                          key={stat.label}
                          label={STAT_LABELS[stat.label] ?? stat.label}
                          code={stat.label}
                          value={stat.value}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-black/50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/62">
                      Development
                    </p>
                    <h2 className="mt-1 text-xl font-black text-white">განვითარება</h2>
                    <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex items-center justify-between text-sm font-black">
                        <span>Base {player.ovr_base}</span>
                        <span>Current {player.ovr_current}</span>
                        <span>Max {potential}</span>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#10b981,#f43f5e)]"
                          style={{ width: `${growthPct}%` }}
                        />
                      </div>
                      <p className="mt-3 text-sm font-bold leading-relaxed text-white/52">
                        ზრდა: {signed(growth)} OVR. დარჩენილი პოტენციალი: {remainingGrowth} OVR.
                      </p>
                    </div>

                    <div className="mt-3 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                          style={manager?.avatar_url ? { backgroundImage: `url(${manager.avatar_url})`, backgroundSize: 'cover' } : undefined}
                        >
                          {manager?.avatar_url ? null : <UserRound className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{managerName}</p>
                          <p className="truncate text-xs font-bold text-white/42">{team?.name ?? 'კლუბი არ ჰყავს'}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="rounded-[28px] border border-emerald-300/14 bg-black/48 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/62">
                        Manager note
                      </p>
                      <h2 className="mt-1 text-xl font-black text-white">ტაქტიკური გამოყენება</h2>
                    </div>
                    <ShieldCheck className="h-6 w-6 text-emerald-200" />
                  </div>
                  <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-white/55">
                    {player.display_name} ამჟამად {position} პოზიციაზეა. თუ დაღლა 55%-ს გადაცდება, როტაცია უფრო
                    უსაფრთხოა; მაღალი მორალისას შეგიძლია უფრო აგრესიულ tempo-ს ან pressing-ს დაეყრდნო.
                  </p>
                </section>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PlayerEmptyState() {
  return (
    <main className="min-h-screen bg-[#020403] px-3 py-4 text-white sm:px-5 sm:py-6">
      <section className="mx-auto max-w-[900px]">
        <div className="pm-neon-frame border border-emerald-300/18 bg-[#020806] p-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/60">
            Player profile
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">მოთამაშე ვერ მოიძებნა</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-7 text-white/50">
            ეს მოთამაშე ბაზაში აღარ არის ან არასწორი ბმულია.
          </p>
          <Link
            href="/playmanager"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-300/10 px-4 text-sm font-black text-emerald-100"
          >
            <ArrowLeft className="h-4 w-4" />
            ქალაქში დაბრუნება
          </Link>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-[118px] rounded-2xl border border-white/10 bg-black/44 p-3">
      <div className="mb-2 text-emerald-200/70">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/50 p-4">
      <div className="mb-3 text-emerald-200/72">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-white/42">{sub}</p>
    </div>
  );
}

function AttributeRow({
  label,
  code,
  value,
}: {
  label: string;
  code: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{label}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/32">{code}</p>
        </div>
        <span className="text-2xl font-black text-emerald-100">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${percent(value, 99)}%` }} />
      </div>
    </div>
  );
}
