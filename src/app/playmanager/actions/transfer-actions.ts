'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  applyPostActionRewards,
  advancePlayManagerTime,
  getAuthenticatedTeam,
  logPlayManagerEvent,
  mapPlayerActionError,
  type PlayManagerPlayerActionResult,
} from './action-helpers';

// ── Transfer market: manager-to-manager listings ─────────────────────────────

export async function listPlayManagerPlayer(
  playerId: string,
  askingPrice: number,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const price = Math.floor(Number(askingPrice));
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: 'invalid_player', message: 'ფასი არასწორია' };
  }

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_list_player', {
    p_team_id: team.id,
    p_player_id: playerId,
    p_price: price,
  });

  if (error) {
    if (error.message.includes('already_listed')) {
      return { success: false, error: 'player_owned', message: 'ფეხბურთელი უკვე გაყიდვაშია' };
    }
    if (error.message.includes('not_owner')) {
      return { success: false, error: 'invalid_player', message: 'ფეხბურთელი შენი არ არის' };
    }
    return mapPlayerActionError(error.message);
  }

  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: 'ფეხბურთელი გაყიდვაში გამოვიდა',
    detail: `მოთხოვნილი ფასი ${price.toLocaleString('ka-GE')} ₾`,
    href: `/playmanager/players/${playerId}`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: `გამოტანილია სატრანსფერო ბაზარზე · ${price.toLocaleString('ka-GE')} ₾` };
}

export async function unlistPlayManagerPlayer(
  listingId: string,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_unlist_player', {
    p_team_id: team.id,
    p_listing_id: listingId,
  });

  if (error) return mapPlayerActionError(error.message);
  revalidatePath('/playmanager');
  return { success: true, message: 'გაყიდვა გაუქმდა' };
}

export async function buyPlayManagerListedPlayer(
  listingId: string,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_buy_listed_player', {
    p_buyer_team_id: team.id,
    p_listing_id: listingId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { price: number; playerId?: string } | null;

  if (error) {
    if (error.message.includes('own_listing')) {
      return { success: false, error: 'invalid_player', message: 'საკუთარ ფეხბურთელს ვერ იყიდი' };
    }
    if (error.message.includes('listing_unavailable')) {
      return { success: false, error: 'player_unavailable', message: 'ეს ფეხბურთელი აღარ იყიდება' };
    }
    return mapPlayerActionError(error.message);
  }

  const price = data?.price ?? 0;
  const xpReward = 18;
  await applyPostActionRewards({ userId: user.id, teamId: team.id, xpReward });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: 'ფეხბურთელი შეძენილია სატრანსფერო ბაზრიდან',
    detail: `${price.toLocaleString('ka-GE')} ₾ deal${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
    href: data?.playerId ? `/playmanager/players/${data.playerId}` : undefined,
  });
  revalidatePath('/playmanager');
  return { success: true, message: `ფეხბურთელი დაემატა გუნდს · XP +${xpReward}`, amount: -price };
}

// ── Transfer NEGOTIATION: manager↔manager offers on a listing ────────────────

function mapTransferOfferError(message: string): PlayManagerPlayerActionResult {
  if (message.includes('price_below_floor')) {
    return { success: false, error: 'unavailable', message: 'ფასი ძალიან დაბალია — მინიმუმ ღირებულების 50%-ია.' };
  }
  if (message.includes('pair_transfer_cap')) {
    return { success: false, error: 'unavailable', message: 'ამ კლუბთან სეზონის ტრანსფერების ლიმიტი ამოიწურა (მაქს. 2).' };
  }
  if (message.includes('offer_exists')) {
    return { success: false, error: 'unavailable', message: 'ამ ფეხბურთელზე უკვე გაქვს გახსნილი შეთავაზება.' };
  }
  if (message.includes('own_listing')) {
    return { success: false, error: 'invalid_player', message: 'საკუთარ ფეხბურთელს ვერ შესთავაზებ.' };
  }
  if (message.includes('listing_unavailable')) {
    return { success: false, error: 'player_unavailable', message: 'ეს ფეხბურთელი აღარ იყიდება.' };
  }
  if (message.includes('offer_unavailable')) {
    return { success: false, error: 'unavailable', message: 'შეთავაზება აღარ არის აქტიური.' };
  }
  if (message.includes('not_your_turn')) {
    return { success: false, error: 'unavailable', message: 'ახლა მეორე მხარის სვლაა.' };
  }
  if (message.includes('not_participant')) {
    return { success: false, error: 'unavailable', message: 'ეს შეთავაზება შენი არ არის.' };
  }
  return mapPlayerActionError(message);
}

// Buyer opens a negotiation on a listing with a proposed price.
export async function makePlayManagerTransferOffer(
  listingId: string,
  amount: number,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const price = Math.floor(Number(amount));
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: 'invalid_player', message: 'ფასი არასწორია' };
  }

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_make_transfer_offer', {
    p_from_team_id: team.id,
    p_listing_id: listingId,
    p_amount: price,
  });
  if (error) return mapTransferOfferError(error.message);

  // Notify the seller (event feed on their team).
  const { data: listing } = await db
    .from('pm_transfer_listings')
    .select('seller_team_id, player:pm_players(display_name)')
    .eq('id', listingId)
    .maybeSingle();
  if (listing?.seller_team_id) {
    const player = Array.isArray(listing.player) ? listing.player[0] : listing.player;
    await logPlayManagerEvent({
      teamId: listing.seller_team_id,
      category: 'finance',
      accent: 'gold',
      title: 'ახალი სატრანსფერო შეთავაზება',
      detail: `${team.name} გთავაზობს ${price.toLocaleString('ka-GE')} ₾${player?.display_name ? ` · ${player.display_name}` : ''}`,
      href: '/playmanager/market?module=transfer_market&offers=1',
    });
  }
  revalidatePath('/playmanager');
  return { success: true, message: `შეთავაზება გაიგზავნა · ${price.toLocaleString('ka-GE')} ₾` };
}

// The awaited party accepts / rejects / counters. On accept the transfer settles.
export async function respondPlayManagerTransferOffer(
  offerId: string,
  action: 'accept' | 'reject' | 'counter',
  counterAmount?: number,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  let counter: number | null = null;
  if (action === 'counter') {
    counter = Math.floor(Number(counterAmount));
    if (!Number.isFinite(counter) || counter <= 0) {
      return { success: false, error: 'invalid_player', message: 'საპასუხო ფასი არასწორია' };
    }
  }

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc(
    'pm_respond_transfer_offer',
    { p_team_id: team.id, p_offer_id: offerId, p_action: action, p_counter_amount: counter ?? undefined },
  );
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { action: string; playerName?: string; price?: number; sellerTeamId?: string; buyerTeamId?: string; awaiting?: string } | null;
  if (error) return mapTransferOfferError(error.message);

  // Notify the counterpart. Fetch the offer to know both sides.
  const { data: offer } = await db
    .from('pm_transfer_offers')
    .select('from_team_id, to_team_id, amount_gel, player:pm_players(display_name)')
    .eq('id', offerId)
    .maybeSingle();
  const counterpartId = offer ? (offer.from_team_id === team.id ? offer.to_team_id : offer.from_team_id) : null;
  const playerRow = offer ? (Array.isArray(offer.player) ? offer.player[0] : offer.player) : null;
  const playerName = playerRow?.display_name ?? '';

  if (counterpartId) {
    if (action === 'accept') {
      const price = Number(data?.price ?? offer?.amount_gel ?? 0);
      // Buyer's side: notify both — buyer gains player, seller gets paid.
      await logPlayManagerEvent({
        teamId: counterpartId,
        category: 'finance',
        accent: 'gold',
        title: 'სატრანსფერო შეთავაზება მიღებულია',
        detail: `${playerName ? `${playerName} · ` : ''}${price.toLocaleString('ka-GE')} ₾`,
        href: '/playmanager/market?module=transfer_market&offers=1',
      });
    } else if (action === 'reject') {
      await logPlayManagerEvent({
        teamId: counterpartId,
        category: 'finance',
        accent: 'red',
        title: 'შეთავაზება უარყოფილია',
        detail: playerName || undefined,
        href: '/playmanager/market?module=transfer_market&offers=1',
      });
    } else {
      await logPlayManagerEvent({
        teamId: counterpartId,
        category: 'finance',
        accent: 'gold',
        title: 'საპასუხო ფასი მიიღე',
        detail: `${playerName ? `${playerName} · ` : ''}${(counter ?? 0).toLocaleString('ka-GE')} ₾`,
        href: '/playmanager/market?module=transfer_market&offers=1',
      });
    }
  }

  revalidatePath('/playmanager');
  const label = action === 'accept' ? 'გარიგება დაიხურა' : action === 'reject' ? 'შეთავაზება უარყოფილია' : `საპასუხო ფასი გაიგზავნა · ${(counter ?? 0).toLocaleString('ka-GE')} ₾`;
  return { success: true, message: label };
}

// Either participant withdraws a pending negotiation.
export async function cancelPlayManagerTransferOffer(
  offerId: string,
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_cancel_transfer_offer', {
    p_team_id: team.id,
    p_offer_id: offerId,
  });
  if (error) return mapTransferOfferError(error.message);
  revalidatePath('/playmanager');
  return { success: true, message: 'შეთავაზება გაუქმდა' };
}
