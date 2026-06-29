import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { getSession } from '@/lib/auth';
import { getTeam } from '@/lib/playmanager/team';
import { getTeamFacilities } from '@/lib/playmanager/facilities';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { formatGel } from '@/lib/playmanager/economy';
import { getFacilityUpgradeCostGel } from '@/lib/playmanager/gameplay';
import { AcademyClient, type AcademyProspect } from './academy-client';

export const dynamic = 'force-dynamic';

const MAX_ACADEMY_LEVEL = 5;

export default async function PlayManagerAcademyPage() {
  const user = await getSession();
  if (!user) redirect('/auth/login?next=/playmanager/academy');
  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const [facilities, snapshot] = await Promise.all([
    getTeamFacilities(team.id),
    getPlayManagerCitySnapshot(team.id),
  ]);

  const academyLevel = facilities.find((f) => f.spriteKey === 'academy')?.level ?? 1;
  const scoutMember = snapshot.staff.members.find((m) => m.roleKey === 'youth_scout');
  const youthScoutLevel = scoutMember?.isHired ? scoutMember.level : 0;
  const prospectTarget = 2 + academyLevel;
  const talentCap = Math.min(8, 3 + youthScoutLevel);
  const canUpgrade = academyLevel < MAX_ACADEMY_LEVEL;

  const prospects: AcademyProspect[] = snapshot.academy.map((p) => ({
    id: p.id,
    playerId: p.playerId ?? null,
    name: p.name,
    position: p.position,
    age: p.age,
    talent: p.talent,
    ovr: p.ovr,
    potential: p.potential,
    signingCostLabel: p.signingCostLabel,
  }));

  return (
    <PlayManagerLightShell>
      <AcademyClient
        teamName={team.name}
        divisionLabel={`D${team.division_id}`}
        balanceLabel={formatGel(team.balance)}
        academyLevel={academyLevel}
        youthScoutLevel={youthScoutLevel}
        prospectTarget={prospectTarget}
        talentCap={talentCap}
        upgradeCostLabel={formatGel(getFacilityUpgradeCostGel('academy', academyLevel))}
        canUpgrade={canUpgrade}
        nextLevelPreview={{ count: 2 + Math.min(MAX_ACADEMY_LEVEL, academyLevel + 1) }}
        prospects={prospects}
        scout={scoutMember ? {
          isHired: scoutMember.isHired,
          level: scoutMember.level,
          maxLevel: scoutMember.maxLevel,
          hireCostLabel: scoutMember.hireCostLabel,
          upgradeCostLabel: scoutMember.upgradeCostLabel,
          weeklyWageLabel: scoutMember.weeklyWageLabel,
          benefitLabel: scoutMember.benefitLabel,
        } : null}
      />
    </PlayManagerLightShell>
  );
}
