import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadEafc26Dataset, resolveRealPlayerStats, type Eafc26DatasetPlayer } from '@/lib/playmanager/eafc26-dataset';
import { getTalent11AdjustedTransferValueGel } from '@/lib/playmanager/economy';
import { getEffectiveRealPlayerTalent, PLAYMANAGER_REAL_PLAYER_RESET_AGE } from '@/lib/playmanager/player-age';
import { normalizePlayManagerPosition } from '@/lib/playmanager/secondary-positions';
import { buildPlayManagerPlayerCardLayout } from '@/lib/playmanager/player-card';
import { parsePlayerCardStats, type PlayerCardStatsInput } from '@/lib/playmanager/player-card-stats';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDivisionTalentWeight, getPlayManagerMarketTier, pickWeightedUniqueItems } from '@/lib/playmanager/market-policy';
import { getMaxStaffLevelForDivision } from '@/lib/playmanager/staff';
import { getTeam } from '@/lib/playmanager/team';

type MarketDbRow = {
  id: string;
  normalized_name: string;
  display_name: string;
  card_display_name: string | null;
  primary_position: string | null;
  card_image_url: string | null;
  nationality_code: string | null;
  is_real: boolean;
  ea_fc_ovr: number | null;
  card_sil_width: number | null;
  card_sil_height: number | null;
  card_sil_x: number | null;
  card_sil_y: number | null;
  card_sil_opacity: number | null;
  card_content_y: number | null;
  card_name_size: number | null;
  card_stats_scale: number | null;
  card_stats: PlayerCardStatsInput;
  talent: number;
  ovr_source: 'generated' | 'ea_fc' | null;
  real_age: number | null;
  age: number;
  ovr_current: number;
  current_transfer_value_gel: number;
  owner_id: string | null;
  status: string;
  available_via_career: boolean | null;
  pending_repack: boolean | null;
};

// Free-agent talent-class cap by division level (1=A top … 4=D bottom):
//   D → pro (≤3) · C → pro+star (≤6) · A/B → up to elite (≤9).
// World-class/rising-star (10–11) only appear via career-end (available_via_career);
// legend (12) never (pending_repack → admin pack).
function getFreeAgentTalentCap(divisionId: number | null): number {
  const level = Math.max(1, Math.min(4, Number(divisionId ?? 4)));
  if (level >= 4) return 3;
  if (level === 3) return 6;
  return 9;
}

type FreeAgentCycleRow = {
  team_id: string;
  scout_level: number;
  offer_player_ids: string[] | null;
  generated_at: string;
  refresh_at: string;
  updated_at: string;
};

function isLegacyEafcRow(row: Pick<MarketDbRow, 'is_real' | 'ovr_source' | 'real_age'>) {
  return row.is_real && row.ovr_source === 'ea_fc' && row.real_age == null;
}

const MARKET_DB_FETCH_CHUNK = 1000;
const FREE_AGENT_OFFER_COUNT = 5;

type GlobalWithCache = typeof globalThis & {
  __pmMarketRowsCache?: { data: MarketDbRow[]; timestamp: number };
};

const MARKET_ROWS_CACHE_TTL_MS = 60_000;

// The full unowned real-player pool is ~16k rows (~14MB) — far above Next's
// unstable_cache 2MB per-item ceiling, which threw "items over 2MB can not be
// cached" → 500 on every market request. Cache it in a module-global instead
// with the same 60s revalidation window; no data-cache size limit applies.
async function fetchAvailableMarketRows(): Promise<MarketDbRow[]> {
  const globalCache = globalThis as GlobalWithCache;
  const now = Date.now();
  if (globalCache.__pmMarketRowsCache && now - globalCache.__pmMarketRowsCache.timestamp < MARKET_ROWS_CACHE_TTL_MS) {
    return globalCache.__pmMarketRowsCache.data;
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { count, error: countError } = await db
    .from('pm_players')
    .select('id', { count: 'exact', head: true })
    .is('owner_id', null)
    .eq('status', 'active');

  if (countError) throw new Error(countError.message);
  const total = count ?? 0;

  const promises = [];
  for (let from = 0; from < total; from += MARKET_DB_FETCH_CHUNK) {
    promises.push(
      db
        .from('pm_players')
        .select('id, normalized_name, display_name, card_display_name, primary_position, card_image_url, nationality_code, is_real, ea_fc_ovr, card_sil_width, card_sil_height, card_sil_x, card_sil_y, card_sil_opacity, card_content_y, card_name_size, card_stats_scale, card_stats, talent, ovr_source, real_age, age, ovr_current, current_transfer_value_gel, owner_id, status, available_via_career, pending_repack')
        .is('owner_id', null)
        .eq('status', 'active')
        .order('id', { ascending: true })
        .range(from, from + MARKET_DB_FETCH_CHUNK - 1)
    );
  }

  const results = await Promise.all(promises);
  const rows: MarketDbRow[] = [];
  for (const res of results) {
    if (res.error) throw new Error(res.error.message);
    rows.push(...(res.data as MarketDbRow[]));
  }

  globalCache.__pmMarketRowsCache = { data: rows, timestamp: now };
  return rows;
}

async function loadAvailableMarketRows() {
  try {
    const data = await fetchAvailableMarketRows();
    return { data, error: null };
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error : new Error('market_rows_failed') };
  }
}

function matchesFilter(player: Eafc26DatasetPlayer, filter: string) {
  const position = normalizePlayManagerPosition(player.position);
  if (filter === 'ALL' || filter === 'SHORTLIST') return true;
  if (filter === 'GK') return position === 'GK';
  if (filter === 'DEF') return ['CB', 'LB', 'RB'].includes(position);
  if (filter === 'MID') return ['CDM', 'CM', 'CAM'].includes(position);
  if (filter === 'ATT') return ['LW', 'RW', 'ST', 'LM', 'RM', 'AM'].includes(position);
  return true;
}

function formatGel(value: number) {
  return `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₾`;
}

function formatRefreshCountdownLabel(nextRefreshAt: string | null) {
  if (!nextRefreshAt) return 'განახლდება სკაუტის დაქირავების შემდეგ';

  const diffMs = new Date(nextRefreshAt).getTime() - Date.now();
  if (diffMs <= 0) return 'ახლა';

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${totalMinutes} წთ-ში`;
  if (minutes === 0) return `${hours} სთ-ში`;
  return `${hours} სთ ${minutes} წთ-ში`;
}

function getScoutOvrWeight(level: number, ovr: number) {
  const safeLevel = Math.max(1, Math.min(5, Math.trunc(level || 1)));
  const profileByLevel = {
    1: { min: 52, max: 68, nearMin: 48, nearMax: 72 },
    2: { min: 60, max: 74, nearMin: 56, nearMax: 78 },
    3: { min: 68, max: 82, nearMin: 64, nearMax: 85 },
    4: { min: 76, max: 88, nearMin: 72, nearMax: 91 },
    5: { min: 82, max: 96, nearMin: 78, nearMax: 99 },
  } as const;
  const profile = profileByLevel[safeLevel as keyof typeof profileByLevel];

  if (ovr >= profile.min && ovr <= profile.max) return 14;
  if (ovr >= profile.nearMin && ovr <= profile.nearMax) return 5;
  return 1;
}

function getScoutTalentWeight(level: number, talent: number) {
  const safeLevel = Math.max(1, Math.min(5, Math.trunc(level || 1)));
  const profileByLevel = {
    1: { min: 1, max: 3, nearMin: 1, nearMax: 4 },
    2: { min: 2, max: 5, nearMin: 1, nearMax: 6 },
    3: { min: 4, max: 7, nearMin: 3, nearMax: 8 },
    4: { min: 6, max: 9, nearMin: 5, nearMax: 10 },
    5: { min: 8, max: 11, nearMin: 7, nearMax: 11 },
  } as const;
  const profile = profileByLevel[safeLevel as keyof typeof profileByLevel];

  if (talent >= profile.min && talent <= profile.max) return 12;
  if (talent >= profile.nearMin && talent <= profile.nearMax) return 4;
  return 1;
}

function getScoutFreeAgentWeight(input: {
  divisionId: number;
  scoutLevel: number;
  row: MarketDbRow;
}) {
  const overall = Math.max(1, input.row.ea_fc_ovr ?? input.row.ovr_current ?? 1);
  const talent = Math.max(1, Math.min(11, Math.trunc(input.row.talent || 1)));
  const divisionWeight = getDivisionTalentWeight(input.divisionId, talent);
  const scoutOvrWeight = getScoutOvrWeight(input.scoutLevel, overall);
  const scoutTalentWeight = getScoutTalentWeight(input.scoutLevel, talent);
  return Math.max(1, divisionWeight * scoutOvrWeight * scoutTalentWeight);
}

async function buildMarketPlayerItemFromRow(
  row: MarketDbRow,
  shortlistSet: Set<string>,
  datasetByName: Map<string, Eafc26DatasetPlayer>,
) {
  const datasetPlayer = datasetByName.get(row.normalized_name);
  const dbStats = parsePlayerCardStats(row.card_stats);
  const resolvedStats = await resolveRealPlayerStats(row.normalized_name, row.card_stats);
  const baseOverall = row.ea_fc_ovr ?? datasetPlayer?.overall ?? row.ovr_current;
  const effectiveTalent = row.is_real
    ? getEffectiveRealPlayerTalent({
        isReal: true,
        storedAge: row.age,
        realAge: row.real_age ?? row.age,
        baseOvr: baseOverall,
        talent: row.talent,
      })
    : row.talent;
  const effectiveValue = getTalent11AdjustedTransferValueGel(
    row.current_transfer_value_gel ?? datasetPlayer?.value ?? 0,
    effectiveTalent,
  );

  return {
    key: row.normalized_name,
    id: row.id,
    name: row.display_name || datasetPlayer?.display_name || row.normalized_name,
    cardDisplayName: row.card_display_name,
    cardImageUrl: row.card_image_url || datasetPlayer?.player_face_url || null,
    nationalityCode: row.nationality_code,
    cardEditorConfig: buildPlayManagerPlayerCardLayout(row),
    stats: resolvedStats ?? dbStats ?? datasetPlayer?.stats,
    position: normalizePlayManagerPosition(row.primary_position ?? datasetPlayer?.position ?? 'CM'),
    age: row.age,
    ovr: row.ovr_current ?? baseOverall,
    talent: effectiveTalent,
    value: effectiveValue,
    valueLabel: formatGel(effectiveValue),
    demand: 'თავისუფალი აგენტი',
    available: true,
    shortlisted: shortlistSet.has(row.normalized_name),
  };
}

export async function GET(request: Request) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const team = await getTeam(user.id);
  if (!team) return NextResponse.json({ error: 'team_missing' }, { status: 404 });

  const url = new URL(request.url);
  const moduleKey = String(url.searchParams.get('module') ?? 'transfer_market').trim().toLowerCase();
  const filter = String(url.searchParams.get('filter') ?? 'ALL').toUpperCase();
  const q = String(url.searchParams.get('q') ?? '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(24, Math.max(10, Number.parseInt(url.searchParams.get('pageSize') ?? '10', 10) || 10));

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const dataset = await loadEafc26Dataset();
  const datasetByName = new Map<string, Eafc26DatasetPlayer>(dataset.map((player) => [player.normalized_name, player]));
  const { data: shortlistRows, error: shortlistError } = await db
    .from('pm_market_shortlist')
    .select('player_key')
    .eq('team_id', team.id);
  if (shortlistError) return NextResponse.json({ error: shortlistError.message }, { status: 500 });
  const shortlistSet = new Set<string>((shortlistRows ?? []).map((row: { player_key: string }) => row.player_key));
  const { data: dbRows, error: dbError } = await loadAvailableMarketRows();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  // Legend players pending admin repack are reserved — never shown on any market.
  const availableRows = (dbRows ?? []).filter((row) => !isLegacyEafcRow(row) && !row.pending_repack);

  if (moduleKey === 'free_agents') {
    const { data: scoutData, error: scoutError } = await db
      .from('pm_staff')
      .select('level')
      .eq('team_id', team.id)
      .eq('role_key', 'scout')
      .maybeSingle();
    if (scoutError) return NextResponse.json({ error: scoutError.message }, { status: 500 });

    const scoutLevel = Math.max(0, Number((scoutData as { level?: number } | null)?.level ?? 0));
    const maxScoutLevel = getMaxStaffLevelForDivision(team.division_id);

    if (scoutLevel <= 0) {
      return NextResponse.json({
        items: [],
        meta: {
          freeAgents: {
            scoutHired: false,
            scoutLevel: 0,
            maxScoutLevel,
            tier: getPlayManagerMarketTier(team.division_id),
            refreshesEveryHours: 24,
            nextRefreshAt: null,
            refreshLabel: formatRefreshCountdownLabel(null),
          },
        },
        pagination: {
          total: 0,
          page: 1,
          pageSize: FREE_AGENT_OFFER_COUNT,
          totalPages: 1,
        },
      });
    }

    const { data: cycleData, error: cycleError } = await db
      .from('pm_free_agent_cycles')
      .select('team_id, scout_level, offer_player_ids, generated_at, refresh_at, updated_at')
      .eq('team_id', team.id)
      .maybeSingle();
    if (cycleError) return NextResponse.json({ error: cycleError.message }, { status: 500 });

    const cycle = (cycleData as FreeAgentCycleRow | null) ?? null;
    const previousOfferIds = new Set((cycle?.offer_player_ids ?? []).filter(Boolean));
    const shouldRefreshOffers =
      !cycle
      || cycle.scout_level !== scoutLevel
      || previousOfferIds.size < FREE_AGENT_OFFER_COUNT
      || new Date(cycle.refresh_at).getTime() <= Date.now();

    let offerRows = availableRows.filter((row) => previousOfferIds.has(row.id));
    let nextRefreshAt = cycle?.refresh_at ?? null;

    if (shouldRefreshOffers) {
      // Class + division gating: D→pro, C→pro+star, A/B→≤elite. world_class/
      // rising_star only via career-end (available_via_career). Legend never
      // (pending_repack → admin pack) — excluded everywhere.
      const talentCap = getFreeAgentTalentCap(team.division_id);
      const pool = availableRows.filter((row) =>
        row.owner_id === null
        && row.status === 'active'
        && !row.pending_repack
        // Academy youth segment (real_age<=19 AND talent<=8) belongs to the
        // academy channel, not free agents. Young elites (talent>=9) stay here.
        && !((row.real_age ?? 99) <= 19 && row.talent <= 8)
        && (row.available_via_career === true || row.talent <= talentCap),
      );
      const preferredFreshPool = pool.length > FREE_AGENT_OFFER_COUNT * 2
        ? pool.filter((row) => !previousOfferIds.has(row.id))
        : pool;
      const weightedPool = preferredFreshPool.length >= FREE_AGENT_OFFER_COUNT ? preferredFreshPool : pool;
      const shuffledPool = [...weightedPool].sort(() => Math.random() - 0.5);
      offerRows = pickWeightedUniqueItems(
        shuffledPool,
        FREE_AGENT_OFFER_COUNT,
        (row) => getScoutFreeAgentWeight({ divisionId: team.division_id, scoutLevel, row }),
      );
      nextRefreshAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const nowIso = new Date().toISOString();
      const { error: upsertCycleError } = await db
        .from('pm_free_agent_cycles')
        .upsert({
          team_id: team.id,
          scout_level: scoutLevel,
          offer_player_ids: offerRows.map((row) => row.id),
          generated_at: nowIso,
          refresh_at: nextRefreshAt,
          updated_at: nowIso,
        });
      if (upsertCycleError) return NextResponse.json({ error: upsertCycleError.message }, { status: 500 });
    }

    const items = await Promise.all(
      offerRows
        .sort((left, right) => right.ovr_current - left.ovr_current || right.talent - left.talent || left.display_name.localeCompare(right.display_name))
        .map((row) => buildMarketPlayerItemFromRow(row, shortlistSet, datasetByName)),
    );

    return NextResponse.json({
      items,
      meta: {
        freeAgents: {
          scoutHired: true,
          scoutLevel,
          maxScoutLevel,
          tier: getPlayManagerMarketTier(team.division_id),
          refreshesEveryHours: 24,
          nextRefreshAt,
          refreshLabel: formatRefreshCountdownLabel(nextRefreshAt),
        },
      },
      pagination: {
        total: items.length,
        page: 1,
        pageSize: FREE_AGENT_OFFER_COUNT,
        totalPages: 1,
      },
    });
  }

  if (moduleKey === 'transfer_market') {
    // Manager-to-manager listings (pm_transfer_listings), excluding your own.
    type ListingRow = {
      id: string;
      asking_price: number;
      seller_team_id: string;
      player: MarketDbRow | MarketDbRow[] | null;
    };
    const { data: listingData, error: listingError } = await db
      .from('pm_transfer_listings')
      .select(`
        id, asking_price, seller_team_id,
        player:pm_players (
          id, normalized_name, display_name, card_display_name, primary_position,
          card_image_url, nationality_code, is_real, ea_fc_ovr,
          card_sil_width, card_sil_height, card_sil_x, card_sil_y, card_sil_opacity,
          card_content_y, card_name_size, card_stats_scale, card_stats, talent,
          ovr_source, real_age, age, ovr_current, current_transfer_value_gel,
          owner_id, status, available_via_career, pending_repack
        )
      `)
      .eq('status', 'listed')
      .neq('seller_team_id', team.id)
      .order('created_at', { ascending: false });
    if (listingError) return NextResponse.json({ error: listingError.message }, { status: 500 });

    const listings = ((listingData ?? []) as ListingRow[])
      .map((listing) => {
        const player = Array.isArray(listing.player) ? listing.player[0] : listing.player;
        return player ? { listing, player } : null;
      })
      .filter((entry): entry is { listing: ListingRow; player: MarketDbRow } => entry !== null)
      .filter(({ player }) => {
        if (player.pending_repack) return false;
        const datasetPlayer = datasetByName.get(player.normalized_name);
        const position = player.primary_position ?? datasetPlayer?.position ?? 'CM';
        if (!matchesFilter({ position } as Eafc26DatasetPlayer, filter)) return false;
        if (filter === 'SHORTLIST' && !shortlistSet.has(player.normalized_name)) return false;
        if (q) {
          const name = (player.display_name || player.normalized_name).toLowerCase();
          if (!name.includes(q) && !player.normalized_name.includes(q)) return false;
        }
        return true;
      });

    const total = listings.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const resolvedPage = Math.min(page, totalPages);
    const start = (resolvedPage - 1) * pageSize;

    const items = await Promise.all(
      listings.slice(start, start + pageSize).map(async ({ listing, player }) => {
        const base = await buildMarketPlayerItemFromRow(player, shortlistSet, datasetByName);
        const askingPrice = Math.max(0, Number(listing.asking_price ?? base.value));
        return {
          ...base,
          listingId: listing.id,
          value: askingPrice,
          valueLabel: formatGel(askingPrice),
          demand: 'ბაზარზე გამოტანილი',
        };
      }),
    );

    return NextResponse.json({
      items,
      pagination: { total, page: resolvedPage, pageSize, totalPages },
    });
  }

  const rowByName = new Map<string, MarketDbRow>(availableRows.map((row: MarketDbRow) => [row.normalized_name, row]));

  // Cheap pass: filter + sort using only fields we already have in memory. The
  // expensive per-player work (resolveRealPlayerStats, card layout) is deferred
  // to AFTER pagination so we build at most `pageSize` (10) items per request —
  // not the whole dataset. This is what made the market slow.
  const candidates = dataset
    .filter((player) => {
      const dbRow = rowByName.get(player.normalized_name);
      if (!dbRow) return false;
      if (!matchesFilter({ ...player, position: dbRow.primary_position ?? player.position }, filter)) return false;
      if (filter === 'SHORTLIST' && !shortlistSet.has(player.normalized_name)) return false;
      if (!q) return true;

      const searchableName = (dbRow.display_name || player.display_name).toLowerCase();
      return searchableName.includes(q) || player.normalized_name.includes(q);
    })
    .map((player) => {
      const dbRow = rowByName.get(player.normalized_name) as MarketDbRow;
      return {
        player,
        dbRow,
        sortOvr: dbRow.ovr_current ?? player.overall,
        sortPosition: normalizePlayManagerPosition(dbRow.primary_position ?? player.position),
        sortName: dbRow.display_name || player.display_name,
      };
    });

  candidates.sort((left, right) => {
    if (right.sortOvr !== left.sortOvr) return right.sortOvr - left.sortOvr;
    if (left.sortPosition !== right.sortPosition) return left.sortPosition.localeCompare(right.sortPosition);
    return left.sortName.localeCompare(right.sortName);
  });

  const total = candidates.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(page, totalPages);
  const start = (resolvedPage - 1) * pageSize;

  // Expensive pass: only for the players actually shown on this page.
  const items = await Promise.all(
    candidates.slice(start, start + pageSize).map(async ({ player, dbRow }) => {
      const dbStats = parsePlayerCardStats(dbRow.card_stats);
      const resolvedStats = await resolveRealPlayerStats(player.normalized_name, dbRow.card_stats);
      const effectiveTalent = getEffectiveRealPlayerTalent({
        isReal: true,
        storedAge: dbRow.age ?? player.age,
        realAge: dbRow.real_age ?? player.age,
        baseOvr: player.overall,
        talent: dbRow.talent,
      });
      const effectiveValue = getTalent11AdjustedTransferValueGel(dbRow.current_transfer_value_gel ?? player.value, effectiveTalent);
      return {
        key: player.normalized_name,
        id: dbRow.id,
        name: dbRow.display_name || player.display_name,
        cardDisplayName: dbRow.card_display_name,
        cardImageUrl: dbRow.card_image_url || player.player_face_url || null,
        nationalityCode: dbRow.nationality_code,
        cardEditorConfig: buildPlayManagerPlayerCardLayout(dbRow),
        // EA's official six card stats are canonical for real-market players.
        // Keep OVR separate: it may change through game progression.
        stats: resolvedStats ?? dbStats ?? player.stats,
        position: normalizePlayManagerPosition(dbRow.primary_position ?? player.position),
        age: PLAYMANAGER_REAL_PLAYER_RESET_AGE,
        ovr: dbRow.ovr_current ?? player.overall,
        talent: effectiveTalent,
        value: effectiveValue,
        valueLabel: `${effectiveValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₾`,
        demand: 'ბაზარზეა',
        available: true,
        shortlisted: shortlistSet.has(player.normalized_name),
      };
    }),
  );

  return NextResponse.json({
    items,
    pagination: {
      total,
      page: resolvedPage,
      pageSize,
      totalPages,
    },
  });
}
