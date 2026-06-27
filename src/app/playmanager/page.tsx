import { redirect } from 'next/navigation';
import { PlayManagerHqHome } from '@/components/playmanager/playmanager-hq-home';
import { getDevelopmentFallbackTeam, getTeam } from '@/lib/playmanager/team';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PlayManagerDashboardPage() {
  const isDevBypass = process.env.NODE_ENV === 'development';
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isDevBypass) redirect('/auth/login?next=/playmanager');

  const team = user ? await getTeam(user.id) : await getDevelopmentFallbackTeam();
  if (!team) redirect('/playmanager/create-team');

  return <PlayManagerHqHome />;
}
