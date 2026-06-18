import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { formatGel } from '@/lib/playmanager/economy';
import { getTeamFacilities } from '@/lib/playmanager/facilities';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { getCombinedClubEffects, getManagerProgression } from '@/lib/playmanager/progression';
import { BuildingPageClient } from '../../[building]/building-page-client';

export const dynamic = 'force-dynamic';

export default async function ArenaLineupPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager/arena/lineup');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const [facilities, citySnapshot] = await Promise.all([
    getTeamFacilities(team.id),
    getPlayManagerCitySnapshot(team.id),
  ]);

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, xp')
    .eq('id', user.id)
    .single();

  const managerName =
    profile?.display_name ||
    profile?.username ||
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Manager';
  const managerUsername =
    profile?.username ||
    (user.user_metadata?.username as string | undefined) ||
    user.email?.split('@')[0] ||
    'manager';
  const managerAvatarUrl =
    profile?.avatar_url ||
    (user.user_metadata?.avatar_url as string | undefined) ||
    null;

  const managerProgression = getManagerProgression(profile?.xp ?? 0);
  const clubEffects = getCombinedClubEffects(managerProgression, facilities);

  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/playmanager/fut_soccer_silhouette_cutout.webp"
        fetchPriority="high"
      />
    <BuildingPageClient
      initialArenaView="lineup"
      building={{
        label: 'მთავარი არენა',
        description: 'შემადგენლობა, ტაქტიკა და მატჩის მზადება',
        status: 'აქტიური',
        spriteKey: 'arena',
        spriteUrl: '/playmanager/city/buildings/arena.webp',
        anchorX: 0.695,
        anchorY: 0.705,
        scale: 1.86,
        tone: 'green',
      }}
      initialFacilities={facilities}
      manager={{
        name: managerName,
        username: managerUsername,
        avatarUrl: managerAvatarUrl,
        xp: managerProgression.xp,
        level: managerProgression.level,
        title: managerProgression.title,
        progressPercent: managerProgression.progressPercent,
        xpToNextLevel: managerProgression.xpToNextLevel,
        perks: managerProgression.perks,
      }}
      team={{
        name: team.name,
        balanceLabel: formatGel(team.balance),
        divisionId: team.division_id,
        divisionLabel: `D${team.division_id}`,
        formPercent: citySnapshot.formPercent,
      }}
      clubEffects={clubEffects}
      citySnapshot={citySnapshot}
    />
    </>
  );
}
