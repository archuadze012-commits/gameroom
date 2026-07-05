import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { processDueCupMatches } from '@/lib/playmanager/cups';
import { processDueLeagueMatches } from '@/lib/playmanager/leagues';
import { getTeam } from '@/lib/playmanager/team';
import { rateLimit } from '@/lib/rate-limit';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  // This fans out to GLOBAL cup/league processing on every call — rate-limit per
  // user so it can't be scripted into a DB-load amplifier. (Longer term this
  // sweep belongs in a cron/queue, not a per-request path.)
  if (!rateLimit(`pm-ensure-session:${user.id}`, 1, 5_000)) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const team = await getTeam(user.id);
  if (!team) return NextResponse.json({ ok: false }, { status: 404 });

  const db = createSupabaseAdminClient();

  await Promise.all([
    processDueCupMatches(),
    processDueLeagueMatches(),
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
