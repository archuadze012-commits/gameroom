import { redirect } from 'next/navigation';
import { PlayManagerMatchdayPage } from '@/components/playmanager/playmanager-matchday-page';
import { getSession } from '@/lib/auth';
import { formatGel } from '@/lib/playmanager/economy';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PlayManagerArenaPage() {
  const user = await getSession();
  if (!user) redirect('/auth/login?next=/playmanager/arena');

  const supabase = await createSupabaseServerClient();
  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, xp')
    .eq('id', user.id)
    .single();

  const citySnapshot = await getPlayManagerCitySnapshot(team.id);

  const managerName =
    profile?.display_name ||
    profile?.username ||
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Manager';
  const managerAvatarUrl =
    profile?.avatar_url ||
    (user.user_metadata?.avatar_url as string | undefined) ||
    null;

  const nextOpponentName = citySnapshot.upcomingCupMatch?.opponentName ?? extractOpponentName(citySnapshot.nextMatchLabel);
  const activeCup =
    citySnapshot.cups.find((cup) => cup.isRegistered && (cup.status === 'registration' || cup.status === 'in_progress')) ?? null;

  const starters = citySnapshot.starters;
  const teamRating = starters.length
    ? Math.round(starters.reduce((sum, player) => sum + player.ovrCurrent, 0) / starters.length)
    : 0;
  const opponentRating = deriveOpponentRating(nextOpponentName, teamRating || 80);

  const upcoming = citySnapshot.upcomingCupMatch;
  const settings = citySnapshot.matchSettings;

  return (
    <PlayManagerMatchdayPage
      teamName={team.name}
      divisionLabel={`D${team.division_id}`}
      managerName={managerName}
      managerAvatarUrl={managerAvatarUrl}
      balanceLabel={formatGel(team.balance)}
      weekLabel={citySnapshot.clock.label}
      nextMatchLabel={citySnapshot.nextMatchLabel}
      nextOpponentName={nextOpponentName}
      competitionLabel={activeCup?.name ?? `ლიგა · D${team.division_id}`}
      roundLabel={upcoming ? `${upcoming.round} ტური` : null}
      isHome={upcoming?.isHome ?? true}
      teamRating={teamRating}
      opponentRating={opponentRating}
      readiness={settings.readiness}
      formPercent={citySnapshot.formPercent}
      avgMorale={settings.avgMorale}
      availableCount={settings.availableCount}
      injuredCount={settings.injuredCount}
      startersCount={starters.length}
      tactics={{
        tacticalStyle: settings.tacticalStyle,
        defensiveLine: settings.defensiveLine,
        tempo: settings.tempo,
        focusSide: settings.focusSide,
      }}
      activeCupName={activeCup?.name ?? null}
      cupsCount={citySnapshot.cups.length}
      activeCup={
        activeCup
          ? {
              name: activeCup.name,
              prizePoolLabel: activeCup.prizePoolLabel,
              participantCount: activeCup.participantCount,
              maxTeams: activeCup.maxTeams,
            }
          : null
      }
      recentForm={citySnapshot.matchHistory.slice(0, 5).map((match) => ({
        result: match.result,
        score: match.score,
        opponent: match.opponent,
        venue: match.venue,
      }))}
    />
  );
}

function extractOpponentName(nextMatchLabel: string) {
  const parts = nextMatchLabel.split('·').map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? 'მეტოქე';
}

// Deterministic, stable opponent rating derived from its name so different
// opponents read differently (clamped to a believable band around our level).
function deriveOpponentRating(name: string, base: number) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 9973;
  }
  const swing = (hash % 11) - 5; // -5..+5
  return Math.max(72, Math.min(92, base + swing));
}
