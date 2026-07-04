import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadEafc26Dataset, resolveRealPlayerStats, type Eafc26DatasetPlayer } from '@/lib/playmanager/eafc26-dataset';
import { getTalent11AdjustedTransferValueGel } from '@/lib/playmanager/economy';
import { getEffectiveRealPlayerTalent, PLAYMANAGER_REAL_PLAYER_RESET_AGE } from '@/lib/playmanager/player-age';
import { normalizePlayManagerPosition, positionMatchesFilter } from '@/lib/playmanager/secondary-positions';
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

// Free-agent talent-class cap by division level (1=A top … 4=D bottom). Pro
// (talent 1-3) is fodder-only and NEVER appears here — the floor is star (4):
//   D → star (4–5) · C → star (4–6) · A/B → up to elite (4–9).
// World-class/rising-star (10–11) only appear via career-end (available_via_career);
// legend (12) never (pending_repack → admin pack).
const FREE_AGENT_TALENT_FLOOR = 4;
function getFreeAgentTalentCap(divisionId: number | null): number {
  const level = Math.max(1, Math.min(4, Number(divisionId ?? 4)));
  if (level >= 4) return 5;
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

const MARKET_PLAYER_COLUMNS =
  'id, normalized_name, display_name, card_display_name, primary_position, card_image_url, nationality_code, is_real, ea_fc_ovr, card_sil_width, card_sil_height, card_sil_x, card_sil_y, card_sil_opacity, card_content_y, card_name_size, card_stats_scale, card_stats, talent, ovr_source, real_age, age, ovr_current, current_transfer_value_gel, owner_id, status, available_via_career, pending_repack';

// GK/DEF/MID position groups for DB-side filtering. MUST stay in sync with
// DEFENCE_POSITIONS / MIDFIELD_POSITIONS in secondary-positions.ts (ATT is
// "everything else", expressed as NOT IN this combined list).
const FILTER_POSITION_SETS: Record<'GK' | 'DEF' | 'MID', string[]> = {
  GK: ['GK'],
  DEF: ['CB', 'LB', 'RB'],
  MID: ['CDM', 'CM', 'CAM', 'AM', 'LM', 'RM'],
};
const NON_ATT_POSITIONS = [...FILTER_POSITION_SETS.GK, ...FILTER_POSITION_SETS.DEF, ...FILTER_POSITION_SETS.MID];

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
        .select(MARKET_PLAYER_COLUMNS)
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
  if (filter === 'ALL' || filter === 'SHORTLIST') return true;
  if (filter === 'GK' || filter === 'DEF' || filter === 'MID' || filter === 'ATT') {
    return positionMatchesFilter(player.position, filter);
  }
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

    let offerRows: MarketDbRow[] = [];
    let nextRefreshAt = cycle?.refresh_at ?? null;

    if (!shouldRefreshOffers) {
      // Steady state (most requests): fetch ONLY the 5 stored offer rows by id
      // instead of pulling the entire ~16k unowned pool into memory.
      const ids = [...previousOfferIds];
      const { data: idRows, error: idError } = await db
        .from('pm_players')
        .select(MARKET_PLAYER_COLUMNS)
        .in('id', ids)
        .is('owner_id', null)
        .eq('status', 'active');
      if (idError) return NextResponse.json({ error: idError.message }, { status: 500 });
      offerRows = ((idRows ?? []) as MarketDbRow[]).filter((row) => !isLegacyEafcRow(row) && !row.pending_repack);
    } else {
      // Refresh path (≤ once per 24h per team): weighted sampling genuinely
      // needs the whole eligible pool, so only HERE do we load the cached
      // full unowned-player snapshot.
      const { data: dbRows, error: dbError } = await loadAvailableMarketRows();
      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      const availableRows = (dbRows ?? []).filter((row) => !isLegacyEafcRow(row) && !row.pending_repack);
      // Class + division gating: D→pro, C→pro+star, A/B→≤elite. world_class/
      // rising_star only via career-end (available_via_career). Legend never
      // (pending_repack → admin pack) — excluded everywhere.
      const talentCap = getFreeAgentTalentCap(team.division_id);
      const pool = availableRows.filter((row) =>
        row.owner_id === null
        && row.status === 'active'
        && !row.pending_repack
        // Pro (talent 1-3) is fodder-only — never a free agent.
        && row.talent >= FREE_AGENT_TALENT_FLOOR
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
    type SellerTeam = { user_id: string | null; name: string | null };
    type ListingRow = {
      id: string;
      asking_price: number;
      seller_team_id: string;
      seller: SellerTeam | SellerTeam[] | null;
      player: MarketDbRow | MarketDbRow[] | null;
    };
    const { data: listingData, error: listingError } = await db
      .from('pm_transfer_listings')
      .select(`
        id, asking_price, seller_team_id,
        seller:pm_teams!seller_team_id ( user_id, name ),
        player:pm_players (
          id, normalized_name, display_name, card_display_name, primary_position,
          card_image_url, nationality_code, is_real, ea_fc_ovr,
          card_sil_width, card_sil_height, card_sil_x, card_sil_y, card_sil_opacity,
          card_content_y, card_name_size, card_stats_scale, card_stats, talent,
          ovr_source, real_age, age, ovr_current, current_transfer_value_gel,
          owner_id, status, available_via_career, pending_repack
        )
      `)
      .eq('status', 'active')
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
        const seller = Array.isArray(listing.seller) ? listing.seller[0] : listing.seller;
        // Floor mirrors pm_transfer_floor: 50% of the raw stored value. Client
        // hint only — the RPC is the source of truth and re-checks on submit.
        const floorPrice = Math.max(1, Math.floor(Number(player.current_transfer_value_gel ?? base.value) / 2));
        return {
          ...base,
          listingId: listing.id,
          sellerTeamId: listing.seller_team_id,
          sellerUserId: seller?.user_id ?? null,
          sellerTeamName: seller?.name ?? null,
          floorPrice,
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

  // Default module (the seed real-player market): filter, sort and paginate in
  // Postgres instead of pulling the whole ~16k-row (~14MB) unowned pool into
  // memory on every request. Only the current page (≤ pageSize rows) crosses
  // the wire; the expensive per-player work below stays page-scoped.
  const buildAllMarketQuery = (headOnly = false) => {
    let query = db
      .from('pm_players')
      .select(MARKET_PLAYER_COLUMNS, headOnly ? { count: 'exact', head: true } : { count: 'exact' })
      .is('owner_id', null)
      .eq('status', 'active')
      // The seed market is real players only (dataset-backed); customs never
      // appear here. Mirrors the old dataset-intersection gate.
      .eq('is_real', true)
      // Legend players pending admin repack are reserved — never shown.
      .not('pending_repack', 'is', true)
      // Exclude legacy EAFC rows (is_real && ovr_source='ea_fc' && real_age null),
      // i.e. keep rows where ANY of the inverse conditions holds.
      .or('ovr_source.is.null,ovr_source.neq.ea_fc,real_age.not.is.null');

    if (filter === 'GK' || filter === 'DEF' || filter === 'MID') {
      query = query.in('primary_position', FILTER_POSITION_SETS[filter]);
    } else if (filter === 'ATT') {
      // ATT is "everything that isn't GK/DEF/MID", including unset positions.
      query = query.or(`primary_position.is.null,primary_position.not.in.(${NON_ATT_POSITIONS.join(',')})`);
    } else if (filter === 'SHORTLIST') {
      query = query.in('normalized_name', [...shortlistSet]);
    }

    // ilike is metacharacter-sensitive; strip PostgREST/LIKE specials from the
    // user's search term rather than trying to escape them.
    const sanitizedQ = q.replace(/[,()%\\_]/g, ' ').trim();
    if (sanitizedQ) {
      query = query.or(`display_name.ilike.%${sanitizedQ}%,normalized_name.ilike.%${sanitizedQ}%`);
    }

    return query
      .order('ovr_current', { ascending: false })
      .order('primary_position', { ascending: true })
      .order('display_name', { ascending: true });
  };

  if (filter === 'SHORTLIST' && shortlistSet.size === 0) {
    return NextResponse.json({ items: [], pagination: { total: 0, page: 1, pageSize, totalPages: 1 } });
  }

  // Count first, then fetch the (clamped) page — an out-of-range .range() makes
  // PostgREST throw "Requested range not satisfiable" rather than return empty.
  const { count, error: countError } = await buildAllMarketQuery(true);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(page, totalPages);
  const start = (resolvedPage - 1) * pageSize;

  const { data: pageRows, error: pageError } = total > 0
    ? await buildAllMarketQuery().range(start, start + pageSize - 1)
    : { data: [], error: null };
  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 });

  // Expensive pass: only for the players actually shown on this page.
  const items = await Promise.all(
    ((pageRows ?? []) as MarketDbRow[]).map(async (dbRow) => {
      const player = datasetByName.get(dbRow.normalized_name);
      const dbStats = parsePlayerCardStats(dbRow.card_stats);
      const resolvedStats = await resolveRealPlayerStats(dbRow.normalized_name, dbRow.card_stats);
      const baseOverall = dbRow.ea_fc_ovr ?? player?.overall ?? dbRow.ovr_current;
      const effectiveTalent = getEffectiveRealPlayerTalent({
        isReal: true,
        storedAge: dbRow.age ?? player?.age ?? PLAYMANAGER_REAL_PLAYER_RESET_AGE,
        realAge: dbRow.real_age ?? player?.age ?? dbRow.age,
        baseOvr: baseOverall,
        talent: dbRow.talent,
      });
      const effectiveValue = getTalent11AdjustedTransferValueGel(dbRow.current_transfer_value_gel ?? player?.value ?? 0, effectiveTalent);
      return {
        key: dbRow.normalized_name,
        id: dbRow.id,
        name: dbRow.display_name || player?.display_name || dbRow.normalized_name,
        cardDisplayName: dbRow.card_display_name,
        cardImageUrl: dbRow.card_image_url || player?.player_face_url || null,
        nationalityCode: dbRow.nationality_code,
        cardEditorConfig: buildPlayManagerPlayerCardLayout(dbRow),
        // EA's official six card stats are canonical for real-market players.
        // Keep OVR separate: it may change through game progression.
        stats: resolvedStats ?? dbStats ?? player?.stats,
        position: normalizePlayManagerPosition(dbRow.primary_position ?? player?.position ?? 'CM'),
        age: PLAYMANAGER_REAL_PLAYER_RESET_AGE,
        ovr: dbRow.ovr_current ?? baseOverall,
        talent: effectiveTalent,
        value: effectiveValue,
        valueLabel: `${effectiveValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₾`,
        demand: 'ბაზარზეა',
        available: true,
        shortlisted: shortlistSet.has(dbRow.normalized_name),
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
