import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';

// Active transfer negotiations involving the current manager's team, split into
// incoming (waiting on ME to respond) and outgoing (waiting on the other side).
export async function GET() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const team = await getTeam(user.id);
  if (!team) return NextResponse.json({ error: 'team_missing' }, { status: 404 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  type OfferRow = {
    id: string;
    player_id: string;
    from_team_id: string;
    to_team_id: string;
    amount_gel: number;
    status: string;
    listing_id: string | null;
    awaiting_team_id: string | null;
    updated_at: string;
    player: { display_name: string | null; normalized_name: string; primary_position: string | null; ovr_current: number; current_transfer_value_gel: number } | null;
    from_team: { name: string | null } | null;
    to_team: { name: string | null } | null;
  };

  const { data, error } = await db
    .from('pm_transfer_offers')
    .select(`
      id, player_id, from_team_id, to_team_id, amount_gel, status, listing_id, awaiting_team_id, updated_at,
      player:pm_players ( display_name, normalized_name, primary_position, ovr_current, current_transfer_value_gel ),
      from_team:pm_teams!from_team_id ( name ),
      to_team:pm_teams!to_team_id ( name )
    `)
    .eq('status', 'pending')
    .or(`from_team_id.eq.${team.id},to_team_id.eq.${team.id}`)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as OfferRow[];
  const items = rows.map((row) => {
    const player = Array.isArray(row.player) ? row.player[0] : row.player;
    const fromTeam = Array.isArray(row.from_team) ? row.from_team[0] : row.from_team;
    const toTeam = Array.isArray(row.to_team) ? row.to_team[0] : row.to_team;
    const iAmBuyer = row.from_team_id === team.id;
    const counterpartName = iAmBuyer ? (toTeam?.name ?? 'უცნობი კლუბი') : (fromTeam?.name ?? 'უცნობი კლუბი');
    const floorPrice = Math.max(1, Math.floor(Number(player?.current_transfer_value_gel ?? 0) / 2));
    return {
      id: row.id,
      listingId: row.listing_id,
      direction: iAmBuyer ? 'outgoing' : 'incoming',
      awaitingMe: row.awaiting_team_id === team.id,
      iAmBuyer,
      amount: Number(row.amount_gel ?? 0),
      floorPrice,
      counterpartName,
      playerName: player?.display_name || player?.normalized_name || 'ფეხბურთელი',
      position: player?.primary_position ?? '—',
      ovr: player?.ovr_current ?? 0,
      updatedAt: row.updated_at,
    };
  });

  const awaitingMe = items.filter((item) => item.awaitingMe).length;
  return NextResponse.json({ items, awaitingMe });
}
