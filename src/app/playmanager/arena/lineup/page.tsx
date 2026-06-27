import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getTeam } from '@/lib/playmanager/team';
import { formatGel } from '@/lib/playmanager/economy';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { LineupTacticsStudio } from '@/components/playmanager/lineup-tactics-studio';

export const dynamic = 'force-dynamic';

export default async function ArenaLineupPage() {
  const user = await getSession();
  if (!user) redirect('/auth/login?next=/playmanager/arena/lineup');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const snapshot = await getPlayManagerCitySnapshot(team.id, { mode: 'lineup' });

  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/playmanager/fut_soccer_silhouette_cutout.webp"
        fetchPriority="high"
      />
      <LineupTacticsStudio
        team={{
          name: team.name,
          divisionLabel: `D${team.division_id}`,
          balanceLabel: formatGel(team.balance),
        }}
        squad={{
          starters: snapshot.starters,
          bench: snapshot.bench,
          reserves: snapshot.reserves,
        }}
        matchSettings={snapshot.matchSettings}
        formPercent={snapshot.formPercent}
      />
    </>
  );
}
