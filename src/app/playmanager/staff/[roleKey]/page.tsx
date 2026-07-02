import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead } from '@/components/playmanager/pm-cards';
import { NestedMiniBox } from '@/components/playmanager/panel-primitives';
import { getSession } from '@/lib/auth';
import { getTeam } from '@/lib/playmanager/team';
import { asPlayManagerDb } from '@/lib/playmanager/db';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStaffPhoto } from '@/lib/playmanager/staff-photos';
import {
  STAFF_ROLE_MAP,
  getMaxStaffLevelForDivision,
  getStaffHireCost,
  getStaffUpgradeCost,
  getStaffWeeklyWage,
  getStaffBenefitLabel,
  type StaffCategory,
  type StaffRoleKey,
} from '@/lib/playmanager/staff';
import { formatGel } from '@/lib/playmanager/economy';
import { StaffDetailActions } from './staff-detail-actions';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<StaffCategory, string> = {
  coaching: 'Coaching',
  scouting: 'Scouting',
  medical: 'Medical',
  operations: 'Operations',
};

type StaffRow = { level: number };

export default async function PlayManagerStaffDetailPage({
  params,
}: {
  params: Promise<{ roleKey: string }>;
}) {
  const { roleKey } = await params;
  if (!(roleKey in STAFF_ROLE_MAP)) notFound();
  const typedRoleKey = roleKey as StaffRoleKey;
  const role = STAFF_ROLE_MAP[typedRoleKey];

  const user = await getSession();
  if (!user) redirect(`/auth/login?next=/playmanager/staff/${roleKey}`);

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data: staffRow } = await db
    .from<StaffRow>('pm_staff')
    .select('level')
    .eq('team_id', team.id)
    .eq('role_key', roleKey)
    .maybeSingle();

  const isHired = Boolean(staffRow);
  const level = staffRow?.level ?? 0;
  const currentLevel = Math.max(1, level || 1);
  const maxLevel = getMaxStaffLevelForDivision(team.division_id);
  const canUpgrade = isHired && level > 0 && level < maxLevel;
  const capReached = isHired && level >= maxLevel;
  const hireCost = getStaffHireCost(typedRoleKey);
  const upgradeCost = canUpgrade ? getStaffUpgradeCost(typedRoleKey, currentLevel) : null;
  const weeklyWage = getStaffWeeklyWage(typedRoleKey, currentLevel);
  const benefitLabel = getStaffBenefitLabel(typedRoleKey, currentLevel);

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[720px] space-y-4">
        <Link
          href="/playmanager/residence?module=staff"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 text-xs font-black text-white/70 transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> პერსონალი
        </Link>

        <PmCard>
          <div className="relative -mx-5 -mt-5 aspect-[16/9] overflow-hidden sm:-mx-6 sm:-mt-6">
            <Image src={getStaffPhoto(roleKey)} alt="" fill sizes="720px" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/15 to-transparent" />
          </div>

          <PmCardHead
            title={role.name}
            subtitle={CATEGORY_LABEL[role.category]}
            tone={isHired ? 'green' : 'red'}
          />

          <p className="text-sm font-bold leading-6 text-white/60">{role.description}</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <NestedMiniBox label="სტატუსი" value={isHired ? `LVL ${level}` : 'თავისუფალია'} />
            <NestedMiniBox label="ბენეფიტი" value={benefitLabel} />
            <NestedMiniBox label="კვირეული ხელფასი" value={formatGel(weeklyWage)} />
            <NestedMiniBox label="მაქს. დონე" value={`LVL ${maxLevel}`} />
            <NestedMiniBox label="დივიზიონი" value={team.division_id ? `D${team.division_id}` : '—'} />
          </div>

          <StaffDetailActions
            roleKey={typedRoleKey}
            isHired={isHired}
            canUpgrade={canUpgrade}
            capReached={capReached}
            hireCostLabel={formatGel(hireCost)}
            upgradeCostLabel={upgradeCost ? formatGel(upgradeCost) : null}
          />
        </PmCard>
      </div>
    </PlayManagerLightShell>
  );
}
