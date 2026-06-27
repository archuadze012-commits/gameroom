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
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
import { hasPermission } from '@/lib/admin';
import { PlayManagerPlayerAdminEditor } from './player-admin-editor';
import { CareerDecisionButtons } from './contract-renew-button';
import type { PlayManagerPlayerAdminDraft } from './actions';
import {
  PlayerFutCard,
} from '@/components/playmanager/player-fut-card';
import {
  createInitialPlayerStats,
  derivePlayerStats,
  normalizePlayerStats,
  type PlayerCardStatsInput,
} from '@/lib/playmanager/player-card-stats';
import { formatGel } from '@/lib/playmanager/economy';
import { buildPlayManagerPlayerCardLayout } from '@/lib/playmanager/player-card';
import { ovrGrowthCap } from '@/lib/playmanager/players';
import { TalentClassBadge } from '@/components/playmanager/talent-class-badge';
import { TraitList } from '@/components/playmanager/trait-badge';
import { BEHAVIORAL_META, behavioralTone, getBehavioral } from '@/lib/playmanager/behavioral';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PlayerRow = {
  id: string;
  normalized_name: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  card_display_name: string | null;
  nationality_code: string | null;
  primary_position: string | null;
  is_real: boolean;
  talent: number;
  tac: number | null;
  traits: string[] | null;
  behavioral: Record<string, number> | null;
  skill_moves: number | null;
  weak_foot: number | null;
  career_end_age: number | null;
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
  card_stats: PlayerCardStatsInput | null;
  card_image_url: string | null;
  card_sil_width: number | null;
  card_sil_height: number | null;
  card_sil_x: number | null;
  card_sil_y: number | null;
  card_sil_opacity: number | null;
  card_content_y: number | null;
  card_name_size: number | null;
  card_stats_scale: number | null;
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

function buildAdminDraft(player: PlayerRow): PlayManagerPlayerAdminDraft {
  const displayParts = player.display_name.split(/\s+/).filter(Boolean);
  const firstName = player.first_name?.trim() || displayParts[0] || '';
  const fallbackLastName = displayParts.slice(1).join(' ').trim();
  const lastName = player.last_name?.trim() || fallbackLastName || firstName;
  const primaryPosition = player.primary_position?.trim().toUpperCase() || 'CM';
  const cardStats = normalizePlayerStats(
    primaryPosition,
    player.card_stats && Object.keys(player.card_stats).length > 0
      ? player.card_stats
      : createInitialPlayerStats(primaryPosition, player.ovr_base),
    player.ovr_base,
  );

  return {
    firstName,
    lastName,
    cardDisplayName: player.card_display_name?.trim() || lastName,
    nationalityCode: player.nationality_code?.trim().toLowerCase() || 'ge',
    primaryPosition,
    ovrBase: player.ovr_base,
    ovrCurrent: player.ovr_current,
    cardStats,
    talent: player.talent,
    traits: player.traits ?? [],
    age: player.age,
    morale: player.morale,
    fatigue: player.fatigue,
    injuryMatches: player.injury_matches,
    status: player.status,
    currentTransferValueGel: player.current_transfer_value_gel,
    baseTransferValueGel: player.base_transfer_value_gel,
    cardImageUrl: player.card_image_url || '',
    cardSilWidth: player.card_sil_width ?? 218,
    cardSilHeight: player.card_sil_height ?? 218,
    cardSilX: player.card_sil_x ?? 0,
    cardSilY: player.card_sil_y ?? 0,
    cardSilOpacity: player.card_sil_opacity ?? 1,
    cardContentY: player.card_content_y ?? -48,
    cardNameSize: player.card_name_size ?? 17,
    cardStatsScale: player.card_stats_scale ?? 1,
  };
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
        'first_name',
        'last_name',
        'card_display_name',
        'nationality_code',
        'primary_position',
        'is_real',
        'talent',
        'tac',
        'traits',
        'behavioral',
        'skill_moves',
        'weak_foot',
        'career_end_age',
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
        'card_stats',
        'card_image_url',
        'card_sil_width',
        'card_sil_height',
        'card_sil_x',
        'card_sil_y',
        'card_sil_opacity',
        'card_content_y',
        'card_name_size',
        'card_stats_scale',
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

  // Scout gate: a player's hidden identity (behavioural profile + traits) is only
  // visible on your own players, or on others' if your club employs a scout.
  const isOwnedByViewer = Boolean(team?.user_id && team.user_id === userData.user.id);
  let hasScout = false;
  if (!isOwnedByViewer) {
    const viewerTeamResult = await db
      .from('pm_teams')
      .select('id')
      .eq('user_id', userData.user.id)
      .maybeSingle<{ id: string }>();
    const viewerTeamId = viewerTeamResult.data?.id ?? null;
    if (viewerTeamId) {
      const scoutResult = await db
        .from('pm_staff')
        .select('id')
        .eq('team_id', viewerTeamId)
        .eq('role_key', 'scout')
        .limit(1)
        .returns<{ id: string }[]>();
      hasScout = (scoutResult.data?.length ?? 0) > 0;
    }
  }
  const attributesRevealed = isOwnedByViewer || hasScout;

  const position = player.primary_position?.trim().toUpperCase() || inferPosition(player, squad);
  const derivedStats = derivePlayerStats(position, player.ovr_current, player.card_stats);
  const peakOvr = Math.min(120, player.ovr_base + ovrGrowthCap(player.talent));
  const growth = player.ovr_current - player.ovr_base;
  const growthPct = peakOvr <= player.ovr_base
    ? 100
    : percent(Math.max(0, player.ovr_current - player.ovr_base), peakOvr - player.ovr_base);
  const valueGrowth = player.current_transfer_value_gel - player.base_transfer_value_gel;
  const status = statusText(player);
  const roleLabel = playerRole(squad);
  const clubLabel = team?.name ?? 'თავისუფალი აგენტი';
  const managerName = manager?.display_name ?? manager?.username ?? (team?.is_bot ? 'AI Manager' : 'უცნობი მენეჯერი');
  const canManageContent = await hasPermission('manage_content');
  const adminDraft = canManageContent ? buildAdminDraft(player) : null;
  const cardEditorConfig = buildPlayManagerPlayerCardLayout(player);
  const behavioral = getBehavioral(player.behavioral);

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1280px] space-y-4">
        <SpotlightCard
          fillHeight={false}
          className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,22,16,0.94),rgba(4,8,6,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/playmanager"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-4 w-4" />
              უკან
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-emerald-300/16 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/80">
                {player.is_real ? 'EA FC' : 'Custom'}
              </span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${status.tone}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <SpotlightCard
                fillHeight={false}
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-4"
              >
                <div className="mx-auto h-[497px] w-[360px] max-w-full overflow-hidden">
                  <div style={{ transform: 'scale(1.04)', transformOrigin: 'top left' }}>
                    <PlayerFutCard
                      name={player.display_name}
                      labelOverride={player.card_display_name}
                      imageUrl={player.card_image_url}
                      nationalityCode={player.nationality_code}
                      position={position}
                      ovr={player.ovr_current}
                      stats={player.card_stats}
                      role={playerCardRole(squad)}
                      availability={player.injury_matches > 0 ? 'injured' : 'ready'}
                      talent={player.talent}
                      editorConfig={cardEditorConfig}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <CompactBadge label="როლი" value={roleLabel} />
                  <CompactBadge label="ასაკი" value={`${player.age}`} />
                  <CompactBadge label="პოზიცია" value={position} />
                </div>
              </SpotlightCard>

              <SpotlightCard
                fillHeight={false}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">კლუბი და მენეჯერი</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-black/24 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/34">კლუბი</p>
                    <p className="mt-1 text-lg font-black text-white">{clubLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/24 p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                        style={manager?.avatar_url ? { backgroundImage: `url(${manager.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                      >
                        {manager?.avatar_url ? null : <UserRound className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/34">მენეჯერი</p>
                        <p className="truncate text-base font-black text-white">{managerName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            <div className="space-y-4">
              <SpotlightCard
                fillHeight={false}
                className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">player profile</p>
                    <h1 className="mt-2 text-3xl font-black leading-none text-white sm:text-5xl">{player.display_name}</h1>
                    <p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-white/42">
                      {clubLabel} · {position} · {player.age} წლის
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <HeroMetric label="OVR" value={String(player.ovr_current)} icon={<Gauge className="h-4 w-4" />} />
                    <HeroMetric label="Base" value={String(player.ovr_base)} icon={<Sparkles className="h-4 w-4" />} />
                    <div className="min-w-[112px] rounded-2xl border border-white/8 bg-black/24 p-3">
                      <div className="mb-2 text-emerald-200/72"><Star className="h-4 w-4" /></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">Talent</p>
                      <div className="mt-1.5"><TalentClassBadge talent={player.talent} showValue /></div>
                    </div>
                    <HeroMetric label="Role" value={roleLabel} icon={<Trophy className="h-4 w-4" />} />
                  </div>
                </div>
              </SpotlightCard>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                <SpotlightCard
                  fillHeight={false}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">saved attributes</p>
                      <h2 className="mt-1 text-2xl font-black text-white">ადმინით შენახული სტატები</h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black text-white/58">
                      {position}
                    </span>
                  </div>

                  {player.tac != null ? (
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-emerald-300/24 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(16,185,129,0.04))] p-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/70">tactical</p>
                        <p className="mt-1 text-lg font-black text-white">ტაქტიკურობა (TAC)</p>
                        <p className="mt-1 text-[11px] font-bold leading-5 text-white/45">
                          თამაშის ჭკუა — სტატებში რომ არ ჩანს. გავლენას ახდენს ტაქტიკის შესრულებაზე მატჩში.
                        </p>
                      </div>
                      <span className="text-4xl font-black tabular-nums text-emerald-100">{player.tac}</span>
                    </div>
                  ) : null}

                  {!attributesRevealed && (behavioral || (player.traits && player.traits.length > 0)) ? (
                    <div className="mb-4 flex items-center gap-3 rounded-[22px] border border-amber-300/16 bg-amber-300/[0.06] p-4">
                      <span className="text-2xl" aria-hidden>🔒</span>
                      <div>
                        <p className="text-sm font-black text-amber-100">თვისებები და ქცევითი პროფილი დამალულია</p>
                        <p className="mt-0.5 text-[11px] font-bold leading-4 text-white/45">
                          ამ მოთამაშის ფარული მახასიათებლების სანახავად დაიქირავე სკაუტი.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {attributesRevealed && player.traits && player.traits.length > 0 ? (
                    <div className="mb-4 rounded-[22px] border border-white/8 bg-black/22 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">თვისებები</p>
                      <div className="mt-3">
                        <TraitList traits={player.traits} />
                      </div>
                    </div>
                  ) : null}

                  {attributesRevealed && behavioral ? (
                    <div className="mb-4 rounded-[22px] border border-white/8 bg-black/22 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">ქცევითი პროფილი</p>
                      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                        {BEHAVIORAL_META.map((meta) => {
                          const value = behavioral[meta.key];
                          return (
                            <div key={meta.key} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-black text-white">{meta.label}</p>
                                <span className={`text-lg font-black tabular-nums ${behavioralTone(value)}`}>{value}</span>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#a855f7)]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                              </div>
                              <p className="mt-1.5 text-[10px] font-bold leading-4 text-white/38">{meta.blurb}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {(player.skill_moves || player.weak_foot) ? (
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div className="rounded-[22px] border border-white/8 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">ოსტატობა</p>
                        <Stars value={player.skill_moves ?? 0} />
                      </div>
                      <div className="rounded-[22px] border border-white/8 bg-black/22 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">სუსტი ფეხი</p>
                        <Stars value={player.weak_foot ?? 0} />
                      </div>
                    </div>
                  ) : null}

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
                </SpotlightCard>

                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
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

                  <SpotlightCard
                    fillHeight={false}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
                  >
                    {(() => {
                      const careerEnd = player.career_end_age ?? 0;
                      const yearsLeft = Math.max(0, careerEnd - player.age);
                      const ending = careerEnd > 0 && player.age >= careerEnd - 1;
                      return (
                        <>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">career</p>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <h2 className="text-xl font-black text-white">კარიერა</h2>
                            <span className={`text-2xl font-black tabular-nums ${ending ? 'text-red-300' : 'text-white'}`}>
                              {player.age}<span className="text-sm text-white/40">/{careerEnd}</span>
                            </span>
                          </div>
                          {ending ? (
                            <p className="mt-2 text-xs font-bold leading-5 text-red-300/80">
                              კარიერის ბოლო სეზონი! გადაწყვიტე: გააგრძელე (½ ფასი) ან დაემშვიდობე (⅓ კომპენსაცია). გადაუწყვეტლად მოთამაშე დატოვებს კლუბს.
                            </p>
                          ) : (
                            <p className="mt-2 text-xs font-bold leading-5 text-white/42">
                              დარჩა ~{yearsLeft} სეზონი. კარიერის ბოლოს მიიღებ შეთავაზებას გაგრძელებაზე ან დამშვიდობებაზე.
                            </p>
                          )}
                          {isOwnedByViewer && ending ? (
                            <CareerDecisionButtons playerId={player.id} />
                          ) : null}
                        </>
                      );
                    })()}
                  </SpotlightCard>

                  <SpotlightCard
                    fillHeight={false}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">development</p>
                    <h2 className="mt-1 text-xl font-black text-white">ფორმის მონიტორინგი</h2>
                    <div className="mt-4 flex items-center justify-between text-sm font-black text-white/72">
                      <span>Base {player.ovr_base}</span>
                      <span>Current {player.ovr_current}</span>
                      <span>Peak {peakOvr}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e,#6ee7b7,#f59e0b)]"
                        style={{ width: `${growthPct}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-white/54">
                      {growth === 0
                        ? 'ბაზისური და მიმდინარე OVR ერთმანეთს ემთხვევა.'
                        : `${growth > 0 ? 'ზრდა' : 'ვარდნა'}: ${signed(growth)} OVR საბაზისოსთან შედარებით.`}
                    </p>
                    <p className="mt-2 text-xs font-bold leading-6 text-white/42">
                      Peak ითვლება ტალანტის ლიმიტით: Base OVR + talent cap.
                    </p>
                  </SpotlightCard>

                  <SpotlightCard
                    fillHeight={false}
                    className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,14,11,0.92),rgba(4,8,6,0.96))] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">manager note</p>
                        <h2 className="mt-1 text-xl font-black text-white">ტაქტიკური გამოყენება</h2>
                      </div>
                      <ShieldCheck className="h-5 w-5 text-emerald-200" />
                    </div>
                    <p className="mt-3 text-sm font-bold leading-7 text-white/56">
                      {player.display_name} ახლა {position} პოზიციაზეა. თუ დაღლა 55%-ს გადაცდება, როტაცია უფრო უსაფრთხოა;
                      მაღალი მორალისას კი უფრო აგრესიულ tempo-ს და pressing-ს უკეთ გაუძლებს.
                    </p>
                  </SpotlightCard>
                </div>
              </div>
            </div>
          </div>
        </SpotlightCard>

        {adminDraft ? <PlayManagerPlayerAdminEditor key={`${player.id}:${JSON.stringify(adminDraft)}`} playerId={player.id} draft={adminDraft} /> : null}
      </div>
    </PlayManagerLightShell>
  );
}

function PlayerEmptyState() {
  return (
    <PlayManagerLightShell>
      <div className="mx-auto max-w-[900px]">
        <SpotlightCard
          fillHeight={false}
          className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,22,16,0.94),rgba(4,8,6,0.98))] p-6 text-center"
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/60">Player profile</p>
          <h1 className="mt-3 text-3xl font-black text-white">მოთამაშე ვერ მოიძებნა</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-7 text-white/50">
            ეს მოთამაშე ბაზაში აღარ არის ან არასწორი ბმულია.
          </p>
          <Link
            href="/playmanager"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
            ქალაქში დაბრუნება
          </Link>
        </SpotlightCard>
      </div>
    </PlayManagerLightShell>
  );
}

function Stars({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <p className="mt-2 text-xl font-black tracking-[0.12em] text-amber-300">
      {'★'.repeat(filled)}
      <span className="text-white/18">{'★'.repeat(5 - filled)}</span>
    </p>
  );
}

function CompactBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/22 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
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
    <div className="min-w-[112px] rounded-2xl border border-white/8 bg-black/24 p-3">
      <div className="mb-2 text-emerald-200/72">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
      <p className="mt-1 truncate text-base font-black text-white sm:text-lg">{value}</p>
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
    <SpotlightCard
      fillHeight={false}
      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
    >
      <div className="mb-3 text-emerald-200/72">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-white/42">{sub}</p>
    </SpotlightCard>
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
    <div className="rounded-[22px] border border-white/8 bg-black/22 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{label}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/32">{code}</p>
        </div>
        <span className="text-2xl font-black text-emerald-100/92">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e,#6ee7b7)]" style={{ width: `${percent(value, 99)}%` }} />
      </div>
    </div>
  );
}
