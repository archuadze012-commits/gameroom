import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerUnreadCount } from '@/lib/playmanager/notifications';

export const dynamic = 'force-dynamic';

// Lightweight unread-count endpoint for the nav bell badge.
export async function GET() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 200 });

  const team = await getTeam(user.id);
  if (!team) return NextResponse.json({ count: 0 }, { status: 200 });

  const count = await getPlayManagerUnreadCount(team.id);
  return NextResponse.json({ count }, { headers: { 'Cache-Control': 'no-store' } });
}
