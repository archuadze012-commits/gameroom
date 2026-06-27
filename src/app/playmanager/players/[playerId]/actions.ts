'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { logAdminAction, requirePermission } from '@/lib/admin';
import { asPlayManagerDb } from '@/lib/playmanager/db';
import { getBaseTransferValueGel, getCurrentTransferValueGel } from '@/lib/playmanager/economy';
import { createInitialPlayerStats, normalizePlayerStats, type PlayerCardStatsInput } from '@/lib/playmanager/player-card-stats';
import { TRAIT_KEYS } from '@/lib/playmanager/traits';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const ALLOWED_POSITIONS = new Set([
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST',
  'LM', 'RM', 'AM', 'LWB', 'RWB', 'LCB', 'RCB', 'LCM', 'RCM',
]);

const ALLOWED_STATUS = new Set(['active', 'injured', 'retired']);

export type PlayManagerPlayerAdminDraft = {
  firstName: string;
  lastName: string;
  cardDisplayName: string;
  nationalityCode: string;
  primaryPosition: string;
  ovrBase: number;
  ovrCurrent: number;
  cardStats: PlayerCardStatsInput;
  talent: number;
  traits: string[];
  age: number;
  morale: number;
  fatigue: number;
  injuryMatches: number;
  status: string;
  currentTransferValueGel: number;
  baseTransferValueGel: number;
  cardImageUrl: string;
  cardSilWidth: number;
  cardSilHeight: number;
  cardSilX: number;
  cardSilY: number;
  cardSilOpacity: number;
  cardContentY: number;
  cardNameSize: number;
  cardStatsScale: number;
};

type PlayManagerPlayerAdminResult =
  | { success: true; message: string }
  | { success: false; error: string };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function updatePlayManagerPlayerAdmin(
  playerId: string,
  draft: PlayManagerPlayerAdminDraft,
): Promise<PlayManagerPlayerAdminResult> {
  const auth = await requirePermission('manage_content');
  if (!auth.ok) return { success: false, error: 'წვდომა არ გაქვს' };

  const firstName = draft.firstName.trim();
  const lastName = draft.lastName.trim();
  const displayName = `${firstName} ${lastName}`.trim();
  if (!firstName || !lastName) {
    return { success: false, error: 'სახელი და გვარი ორივე აუცილებელია' };
  }

  const requestedPosition = draft.primaryPosition.trim().toUpperCase();
  const primaryPosition = requestedPosition === 'CF' ? 'ST' : requestedPosition;
  if (!ALLOWED_POSITIONS.has(primaryPosition)) {
    return { success: false, error: 'პოზიცია არასწორია' };
  }

  const nationalityCode = draft.nationalityCode.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(nationalityCode)) {
    return { success: false, error: 'დროშისთვის 2-ასოიანი კოდი ჩაწერე, მაგალითად ge ან br' };
  }

  const status = draft.status.trim().toLowerCase();
  if (!ALLOWED_STATUS.has(status)) {
    return { success: false, error: 'სტატუსი არასწორია' };
  }

  const ovrBase = clamp(Math.round(draft.ovrBase), 40, 99);
  const ovrCurrent = clamp(Math.round(draft.ovrCurrent), 40, 99);

  const resolvedStats = draft.cardStats && Object.keys(draft.cardStats).length > 0
    ? draft.cardStats
    : createInitialPlayerStats(primaryPosition, ovrBase);
  const normalizedStats = normalizePlayerStats(primaryPosition, resolvedStats, ovrBase);

  const payload = {
    first_name: firstName,
    last_name: lastName,
    display_name: displayName,
    card_display_name: draft.cardDisplayName.trim() || null,
    nationality_code: nationalityCode,
    primary_position: primaryPosition,
    ovr_base: ovrBase,
    ovr_current: ovrCurrent,
    ea_fc_ovr: ovrBase,
    base_card_stats: normalizedStats,
    card_stats: normalizedStats,
    talent: clamp(Math.round(draft.talent), 1, 12),
    traits: Array.from(new Set((draft.traits ?? []).filter((t) => (TRAIT_KEYS as string[]).includes(t)))).slice(0, 3),
    age: clamp(Math.round(draft.age), 18, 40),
    morale: clamp(Math.round(draft.morale), 0, 100),
    fatigue: clamp(Math.round(draft.fatigue), 0, 100),
    injury_matches: clamp(Math.round(draft.injuryMatches), 0, 99),
    status,
    // Base price is OVR-derived (talent premium is applied at display time, like
    // the market). Editing OVR/talent now flows straight into the stored value.
    base_transfer_value_gel: getBaseTransferValueGel(ovrBase),
    current_transfer_value_gel: getCurrentTransferValueGel(ovrBase, ovrCurrent),
    card_image_url: draft.cardImageUrl.trim() || null,
    card_sil_width: draft.cardSilWidth,
    card_sil_height: draft.cardSilHeight,
    card_sil_x: draft.cardSilX,
    card_sil_y: draft.cardSilY,
    card_sil_opacity: clamp(draft.cardSilOpacity, 0, 1),
    card_content_y: draft.cardContentY,
    card_name_size: draft.cardNameSize,
    card_stats_scale: clamp(draft.cardStatsScale, 0.5, 1.5),
  };

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { error } = await db
    .from<Record<string, unknown>>('pm_players')
    .update(payload)
    .eq('id', playerId);

  if (error) {
    if (error.message.includes('pm_players_real_name_uniq') || error.message.includes('duplicate')) {
      return { success: false, error: 'ასეთი რეალური მოთამაშის სახელი უკვე არსებობს' };
    }
    return { success: false, error: 'შენახვა ვერ მოხერხდა' };
  }

  await logAdminAction({
    actorId: auth.userId,
    action: 'playmanager_player_admin_update',
    targetType: 'pm_players',
    targetId: playerId,
    metadata: {
      displayName,
      primaryPosition,
      nationalityCode,
      cardDisplayName: payload.card_display_name,
      cardImageUrl: payload.card_image_url,
    },
  });

  revalidatePath('/playmanager');
  revalidatePath('/playmanager/market');
  revalidatePath(`/playmanager/players/${playerId}`);
  updateTag('market-players');
  (globalThis as { __pmMarketRowsCache?: unknown }).__pmMarketRowsCache = undefined;

  return { success: true, message: 'მოთამაშე განახლდა' };
}
