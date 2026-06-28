import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { asPlayManagerDb } from '@/lib/playmanager/db';
import { processDueCupMatches } from '@/lib/playmanager/cups';
import { getTeam } from '@/lib/playmanager/team';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const team = await getTeam(user.id);
  if (!team) return NextResponse.json({ ok: false }, { status: 404 });

  const db = asPlayManagerDb(createSupabaseAdminClient());

  await Promise.all([
    processDueCupMatches(),
    db.rpc('pm_ensure_season_rows', { p_team_id: team.id }),
    db.rpc('pm_ensure_match_settings', { p_team_id: team.id }),
    db.rpc('pm_ensure_calendar', { p_team_id: team.id }),
    db.rpc('pm_ensure_finance_state', { p_team_id: team.id }),
  ]);

  // Academy draws from the real unowned youth pool (real_age<=19, talent<=8);
  // tops the team up to 3 active prospects. No virtual generation.
  await db.rpc('pm_ensure_academy_youth', { p_team_id: team.id });

  return NextResponse.json({ ok: true });
}
