import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead } from '@/components/playmanager/pm-cards';
import { NestedMiniBox } from '@/components/playmanager/panel-primitives';
import { CoachTrainingList } from '@/components/playmanager/coach-training-list';
import { HeadCoachHub, type PendingOvrPlayer } from '@/components/playmanager/head-coach-hub';
import { getSession } from '@/lib/auth';
import { getTeam } from '@/lib/playmanager/team';
import { getTeamFacilities } from '@/lib/playmanager/facilities';
import { getCombinedClubEffects, getManagerProgression } from '@/lib/playmanager/progression';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
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
  getTrainingDailyCapacity,
  type StaffCategory,
  type StaffRoleKey,
} from '@/lib/playmanager/staff';
import { isPositionCoachRole, positionMatchesCoach } from '@/lib/playmanager/secondary-positions';
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

  // ── Coach-specific working area (coaching roles only) ──
  // Position coaches train their group; the assistant runs the XP economy +
  // OVR-confirm queue; the set-piece coach shows its match contribution.
  let coachSection: ReactNode = null;
  if (role.category === 'coaching') {
    const [snapshot, facilities, profileRow] = await Promise.all([
      getPlayManagerCitySnapshot(team.id, { mode: 'light' }),
      getTeamFacilities(team.id),
      db.from<{ xp: number }>('profiles').select('xp').eq('id', team.user_id).maybeSingle(),
    ]);
    const managerXp = profileRow.data?.xp ?? 0;
    const trainingBonusPct = getCombinedClubEffects(getManagerProgression(managerXp), facilities).bonuses.trainingXpPct;

    if (isPositionCoachRole(typedRoleKey)) {
      const players = snapshot.squad.filter((player) => positionMatchesCoach(player.position, typedRoleKey));
      // Daily training-session quota (see pm_train_player / pm_training_capacity).
      const headCoachMember = snapshot.staff.members.find((member) => member.roleKey === 'head_coach');
      const headCoachLevel = headCoachMember?.isHired ? headCoachMember.level : 0;
      const trainingFacilityLevel = facilities.find((facility) => facility.spriteKey === 'training')?.level ?? 0;
      const sessionCapacity = getTrainingDailyCapacity(headCoachLevel, trainingFacilityLevel);
      const { data: cal } = await db
        .from<{ train_used: number; train_day: number; total_days: number }>('pm_calendar')
        .select('train_used, train_day, total_days')
        .eq('team_id', team.id)
        .maybeSingle();
      const usedToday = cal && cal.train_day === cal.total_days ? cal.train_used : 0;
      const sessionsLeft = Math.max(0, sessionCapacity - usedToday);

      // Training now banks gains into pending_card_stats rather than moving
      // ovr_current directly (see 20260703d) — the growth-headroom display and
      // the "maxed" block must be computed from the PENDING-implied OVR, not the
      // live one, or a fully-trained-but-unconfirmed player still shows an
      // enabled train button that errors with player_maxed on click.
      const pendingOvrByPlayerId = new Map<string, number>();
      if (players.length > 0) {
        const { data: pendingRows } = await db
          .from<{ id: string; pending_card_stats: Record<string, number> | null }>('pm_players')
          .select('id, pending_card_stats')
          .in('id', players.map((player) => player.id));
        const withPending = (pendingRows ?? []).filter((row) => row.pending_card_stats != null);
        await Promise.all(
          withPending.map(async (row) => {
            const player = players.find((candidate) => candidate.id === row.id);
            if (!player) return;
            const { data: pendingOvr } = await db.rpc<number>('pm_player_overall_from_stats', {
              p_position: player.position,
              p_card_stats: row.pending_card_stats,
              p_fallback: player.ovrCurrent,
            });
            if (typeof pendingOvr === 'number') pendingOvrByPlayerId.set(row.id, pendingOvr);
          }),
        );
      }

      coachSection = (
        <CoachTrainingList
          players={players}
          pendingOvrByPlayerId={Object.fromEntries(pendingOvrByPlayerId)}
          coachHired={isHired}
          coachLevel={currentLevel}
          trainingBonusPct={trainingBonusPct}
          sessionsLeft={sessionsLeft}
          sessionCapacity={sessionCapacity}
          emptyHint="ამ ჯგუფში მოთამაშე ჯერ არ არის."
        />
      );
    } else if (typedRoleKey === 'head_coach') {
      const { data: pendingRows } = await db
        .from<{ id: string; display_name: string; ovr_current: number; pending_card_stats: unknown }>('pm_players')
        .select('id, display_name, ovr_current, pending_card_stats')
        .eq('owner_id', team.id);
      const pendingPlayers: PendingOvrPlayer[] = (pendingRows ?? [])
        .filter((r) => r.pending_card_stats != null)
        .map((r) => ({ id: r.id, name: r.display_name, ovrCurrent: r.ovr_current }));
      coachSection = (
        <HeadCoachHub
          managerXp={managerXp}
          pendingPlayers={pendingPlayers}
          teamReadiness={snapshot.matchSettings.readiness}
          readinessFlat={snapshot.staff.bonuses.readinessFlat}
          hired={isHired}
          level={currentLevel}
        />
      );
    } else if (typedRoleKey === 'set_piece_coach') {
      const setPiecePct = snapshot.staff.bonuses.setPiecePct;
      coachSection = (
        <PmCard>
          <PmCardHead title="სტანდარტული პოზიციები" subtitle="Set-piece threat" tone={isHired ? 'green' : 'red'} />
          <div className="grid grid-cols-2 gap-2">
            <NestedMiniBox label="მატჩის ბონუსი" value={isHired ? `+${setPiecePct}%` : '—'} valueClassName={isHired ? 'text-emerald-300' : 'text-white'} />
            <NestedMiniBox label="დონე" value={isHired ? `LVL ${currentLevel}` : 'დაუქირავებელი'} />
          </div>
          <p className="text-[11px] font-bold leading-5 text-white/45">
            სტანდარტების მწვრთნელი ზრდის გუნდის საჰაერო და სტანდარტული მდგომარეობების საფრთხეს მატჩში (კუთხურები,
            საჯარიმოები, პენალტები). აბარგების პირდაპირი დანიშვნა მალე დაემატება.
          </p>
        </PmCard>
      );
    }
  }

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

        {coachSection}
      </div>
    </PlayManagerLightShell>
  );
}
