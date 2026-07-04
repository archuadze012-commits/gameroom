'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Coins,
  Dumbbell,
  ExternalLink,
  GraduationCap,
  Home,
  Search,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';
import { PmCard, PmCardHead, PmPill, PmAction, PmGauge, PmPhotoCard, type PmTone } from '@/components/playmanager/pm-cards';
import { NestedMiniBox } from '@/components/playmanager/panel-primitives';
import { TalentClassBadge } from '@/components/playmanager/talent-class-badge';
import {
  signPlayManagerAcademyProspect,
  type PlayManagerPlayerActionResult,
} from '@/app/playmanager/actions';
import { getFacilityUpgradeCostGel, type CityActionKey } from '@/lib/playmanager/gameplay';
import { getMaxStaffLevelForDivision, type StaffCategory } from '@/lib/playmanager/staff';
import { getStaffPhoto } from '@/lib/playmanager/staff-photos';
import { formatGel } from '@/lib/playmanager/economy';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import type { ClubEffectsSummary, ManagerPerk } from '@/lib/playmanager/progression';
import type { EditableCityBuilding } from '@/components/playmanager/playmanager-city-editor';

type ResidenceManager = {
  name: string;
  username: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  title: string;
  progressPercent: number;
  xpToNextLevel: number;
  perks: ManagerPerk[];
};

type ResidenceTeam = {
  name: string;
  balanceLabel: string;
  divisionId: number;
  divisionLabel: string;
  formPercent: number;
};

type ResidenceFacility = {
  level: number;
  progress: number;
  upgradeCost: string;
  nextUnlock: string;
};

export type PlayManagerResidenceProps = {
  building: EditableCityBuilding;
  manager: ResidenceManager;
  team: ResidenceTeam;
  snapshot: PlayManagerCitySnapshot;
  clubEffects: ClubEffectsSummary;
  facilities: Record<string, ResidenceFacility>;
  pendingAction: string | null;
  actionMessage: string | null;
  onRunAction: (spriteKey: string, action: CityActionKey) => void;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
};

const CATEGORY_META: Record<StaffCategory, { label: string; icon: LucideIcon }> = {
  coaching: { label: 'Coaching', icon: Dumbbell },
  scouting: { label: 'Scouting', icon: Search },
  medical: { label: 'Medical', icon: Stethoscope },
  operations: { label: 'Operations', icon: Coins },
};

export function PlayManagerResidence(props: PlayManagerResidenceProps) {
  const { building, manager, team, snapshot, facilities, pendingAction, actionMessage, onRunAction, onRunPlayerAction } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get('module');

  const facility = facilities.residence ?? { level: 1, progress: 0, upgradeCost: '₾0', nextUnlock: '' };
  const upgradeCost = getFacilityUpgradeCostGel('residence', facility.level);
  const canUpgrade = manager.level >= facility.level + 1;
  const upgradePending = pendingAction === 'residence:facility_upgrade';

  const squad = snapshot.squad;
  const avgOvr = squad.length ? Math.round(squad.reduce((sum, p) => sum + p.ovrCurrent, 0) / squad.length) : 0;
  const activeStaffCount = snapshot.staff.members.filter((member) => member.isHired).length;
  const academyLevel = facilities.academy?.level ?? 1;
  const youthScoutLevel = snapshot.staff.members.find((member) => member.roleKey === 'youth_scout')?.level ?? 0;

  function openModule(key: string) {
    router.push(`/playmanager/residence?module=${key}`, { scroll: false });
  }

  function goBack() {
    router.push('/playmanager/residence', { scroll: false });
  }

  return (
    <main className="pm-office pm-feedskin pm-hq-shell min-h-screen overflow-x-hidden bg-[#05070a] pb-24 text-white xl:pb-0 xl:pl-[116px]">
      <PlayManagerSidebar />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1160px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        {actionMessage ? (
          <div className="mb-3 rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        {moduleKey === 'squad' ? (
          <SquadView squad={squad} onBack={goBack} />
        ) : moduleKey === 'academy' ? (
          <AcademyView
            academy={snapshot.academy}
            academyLevel={academyLevel}
            youthScoutLevel={youthScoutLevel}
            pendingAction={pendingAction}
            onRunPlayerAction={onRunPlayerAction}
            onBack={goBack}
          />
        ) : moduleKey === 'staff' ? (
          <StaffView
            members={snapshot.staff.members}
            divisionLabel={team.divisionLabel}
            maxStaffLevel={getMaxStaffLevelForDivision(team.divisionId)}
            totalWeeklyWagesLabel={snapshot.staff.totalWeeklyWagesLabel}
            bonuses={snapshot.staff.bonuses}
            onBack={goBack}
          />
        ) : (
          <div className="space-y-4">
            {/* ── CLUB CARD (pinned post) ── */}
            <PmCard>
              <PmCardHead
                icon={Home}
                title={building.label || 'საცხოვრებელი ბაზა'}
                subtitle={`${team.name} · Residence Level ${facility.level}`}
                right={<PmPill tone="green">LVL {facility.level}</PmPill>}
              />
              <div className="flex flex-wrap items-center gap-2">
                <PmPill tone="green">მოთამაშეები {squad.length}</PmPill>
                <PmPill>საშ. OVR {avgOvr}</PmPill>
                <PmPill tone="green">აკადემია {snapshot.academy.length}</PmPill>
                <PmPill tone={activeStaffCount > 0 ? 'green' : 'red'}>
                  პერსონალი {activeStaffCount}/{snapshot.staff.members.length}
                </PmPill>
              </div>
            </PmCard>

            {/* ── DEPARTMENTS (photo feed cards) ── */}
            {/* Mobile: 2-per-row; odd count (3) → first card spans full width. */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <PmPhotoCard
                title="მთავარი გუნდი"
                photo="/playmanager/city/buildings/tower.webp"
                tone="green"
                onClick={() => openModule('squad')}
                className="col-span-2 lg:col-span-1"
              />
              <PmPhotoCard
                title="აკადემია"
                photo="/playmanager/city/buildings/academy.webp"
                tone="green"
                onClick={() => openModule('academy')}
              />
              <PmPhotoCard
                title="პერსონალი"
                photo="/playmanager/module-cards/staff/head-coach.webp"
                tone="green"
                onClick={() => openModule('staff')}
              />
            </div>

            {/* ── FACILITY PROGRESS + UPGRADE ── */}
            <PmCard>
              <PmCardHead icon={Home} title="შენობის დონე" subtitle="Facility" />
              <div>
                <div className="flex items-center justify-between text-[11px] font-black text-white/55">
                  <span>Level {facility.level}</span>
                  <span>{facility.progress}%</span>
                </div>
                <PmGauge percent={facility.progress} className="mt-2" />
                {facility.nextUnlock ? (
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
                    შემდეგი: {facility.nextUnlock}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">გაუმჯობესება → Level {facility.level + 1}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-100/60">+გუნდის ზომის ლიმიტი · {formatGel(upgradeCost)}</p>
                </div>
                {canUpgrade ? (
                  <PmAction tone="green" disabled={upgradePending} onClick={() => onRunAction('residence', 'facility_upgrade')}>
                    {upgradePending ? 'მუშავდება...' : 'გაუმჯობესება'}
                  </PmAction>
                ) : (
                  <PmPill>🔒 Manager Lv {facility.level + 1}</PmPill>
                )}
              </div>
            </PmCard>
          </div>
        )}
      </div>

      <PlayManagerBottomNav />
    </main>
  );
}

// ── Squad module ─────────────────────────────────────────────────────────────

function SquadView({ squad, onBack }: { squad: PlayManagerCitySnapshot['squad']; onBack: () => void }) {
  const avgOvr = squad.length ? Math.round(squad.reduce((sum, p) => sum + p.ovrCurrent, 0) / squad.length) : 0;
  const groups: Array<{ key: 'starter' | 'bench' | 'reserve'; label: string; tone?: PmTone }> = [
    { key: 'starter', label: 'საბაზო XI', tone: 'green' },
    { key: 'bench', label: 'სათადარიგო' },
    { key: 'reserve', label: 'რეზერვი' },
  ];

  return (
    <div className="space-y-4">
      <BackBar title="მთავარი გუნდი" onBack={onBack} />

      <div className="grid grid-cols-3 gap-3">
        <PmCard className="items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">მოთამაშეები</p>
          <p className="pm-office-title mt-1 text-2xl">{squad.length}</p>
        </PmCard>
        <PmCard className="items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">საშ. OVR</p>
          <p className="pm-office-title mt-1 text-2xl">{avgOvr}</p>
        </PmCard>
        <PmCard className="items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">საბაზო XI</p>
          <p className="pm-office-title mt-1 text-2xl">{squad.filter((p) => p.role === 'starter').length}</p>
        </PmCard>
      </div>

      {squad.length === 0 ? (
        <PmCard>
          <p className="py-6 text-center text-sm font-bold text-white/40">გუნდში მოთამაშეები არ არის.</p>
        </PmCard>
      ) : (
        groups.map((group) => {
          const rows = squad.filter((p) => p.role === group.key);
          if (rows.length === 0) return null;
          return (
            <PmCard key={group.key}>
              <PmCardHead icon={UsersRound} title={group.label} subtitle={`${rows.length} მოთამაშე`} tone={group.tone === 'red' ? 'red' : 'green'} />
              <div className="space-y-1.5">
                {rows.map((player) => (
                  <Link
                    key={player.id}
                    href={`/playmanager/players/${player.id}`}
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-black/24 px-3 py-2.5 transition hover:border-emerald-300/24 hover:bg-white/[0.04]"
                  >
                    <PlayerAvatar url={player.cardImageUrl} fallback={(player.cardDisplayName?.trim() || player.name).charAt(0).toUpperCase()} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-black text-white">
                        <span className="text-emerald-300/70 tabular-nums">#{player.squadNumber ?? '–'}</span>
                        <span className="truncate">{player.cardDisplayName?.trim() || player.name}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-white/42">
                        <span className="rounded border border-white/12 bg-white/[0.05] px-1.5 py-px text-[10px] font-black tracking-wide text-white/65">
                          {player.position}
                        </span>
                        <span>Talent {player.talent}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pl-1">
                      <div className="text-right leading-tight">
                        <p className="text-sm font-black text-white tabular-nums">{player.ovrCurrent}</p>
                        <p className="text-[10px] font-bold text-white/35">OVR</p>
                      </div>
                      <div className="text-right leading-tight">
                        <p className="text-sm font-black text-white/70 tabular-nums">{player.age}</p>
                        <p className="text-[10px] font-bold text-white/35">ასაკი</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </PmCard>
          );
        })
      )}
    </div>
  );
}

function PlayerAvatar({ url, fallback, size = 40 }: { url?: string | null; fallback: string; size?: number }) {
  const real = url?.trim();
  // Generic full-body silhouettes (players without a real face) read as broken
  // green/white shapes when cropped to a circle — show the initial instead.
  const isPhoto = real && !/silhouette/i.test(real);
  if (isPhoto) {
    return (
      <span className="block shrink-0 overflow-hidden rounded-full bg-[#0c1a13] ring-1 ring-white/14" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={real}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ objectPosition: '50% 16%' }}
        />
      </span>
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(52,211,153,0.3),rgba(16,84,60,0.24))] text-xs font-black text-emerald-100 ring-1 ring-emerald-300/22"
      style={{ width: size, height: size }}
    >
      {fallback}
    </span>
  );
}

// ── Academy module ────────────────────────────────────────────────────────────

function AcademyView({
  academy,
  academyLevel,
  youthScoutLevel,
  pendingAction,
  onRunPlayerAction,
  onBack,
}: {
  academy: PlayManagerCitySnapshot['academy'];
  academyLevel: number;
  youthScoutLevel: number;
  pendingAction: string | null;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
  onBack: () => void;
}) {
  const prospectTarget = 2 + academyLevel;
  const talentCap = Math.min(8, 4 + youthScoutLevel);

  return (
    <div className="space-y-4">
      <BackBar title="აკადემია" onBack={onBack} />

      <PmCard>
        <PmCardHead
          icon={GraduationCap}
          title={`აკადემია · დონე ${academyLevel}`}
          subtitle="Youth pipeline"
          right={<PmPill tone="green">{academy.length}/{prospectTarget} · მაქს. კლასი {talentCap}</PmPill>}
        />
        <p className="text-xs font-bold leading-5 text-white/54">
          <b className="text-white/75">აკადემიის დონე</b> ზრდის ტალანტების <b className="text-white/75">რაოდენობას</b> (2+დონე) და{' '}
          <b className="text-white/75">განვითარების სიჩქარეს</b>. <b className="text-white/75">აკადემიის სკაუტი</b> (დონე {youthScoutLevel}) განსაზღვრავს{' '}
          ხარისხს — ტალანტის ჭერს (4–{talentCap}). ხელმოწერა მოთამაშეს პირდაპირ გუნდში 15 წლის ასაკით გადაიყვანს.
        </p>
      </PmCard>

      {academy.length === 0 ? (
        <PmCard>
          <p className="py-6 text-center text-sm font-bold text-white/40">ტალანტები ჯერ არ არის.</p>
        </PmCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {academy.map((prospect) => {
            const matured = prospect.ovr >= prospect.potential;
            const devPct = prospect.potential > prospect.ovr
              ? Math.round(((prospect.ovr - 40) / Math.max(1, prospect.potential - 40)) * 100)
              : 100;
            const signPending = pendingAction === `academy:${prospect.id}`;
            return (
              <PmCard key={prospect.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-white">{prospect.name}</p>
                  {matured ? <PmPill tone="green">მზად</PmPill> : null}
                </div>
                <TalentClassBadge talent={prospect.talent} showValue />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <NestedMiniBox label="POS" value={prospect.position} />
                  <NestedMiniBox label="OVR" value={String(prospect.ovr)} />
                  <NestedMiniBox label="POT" value={String(prospect.potential)} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] font-black text-white/44">
                    <span>განვითარება</span>
                    <span>{prospect.ovr} → {prospect.potential}</span>
                  </div>
                  <PmGauge percent={devPct} className="mt-1.5" />
                </div>
                <p className="text-[11px] font-bold text-white/48">
                  {prospect.age} წლის · {matured ? 'მზადაა მთავარ გუნდში' : 'ვითარდება აკადემიაში'}
                </p>
                <PmAction
                  tone="green"
                  disabled={signPending}
                  onClick={() => onRunPlayerAction(`academy:${prospect.id}`, () => signPlayManagerAcademyProspect(prospect.id))}
                  className="w-full justify-center"
                >
                  {signPending ? 'მუშავდება...' : `ხელმოწერა ${prospect.signingCostLabel}`}
                </PmAction>
                {prospect.playerId ? (
                  <Link
                    href={`/playmanager/players/${prospect.playerId}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/70 transition hover:border-emerald-300/20 hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    პროფილი
                  </Link>
                ) : null}
              </PmCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Staff module ──────────────────────────────────────────────────────────────

function StaffView({
  members,
  divisionLabel,
  maxStaffLevel,
  totalWeeklyWagesLabel,
  bonuses,
  onBack,
}: {
  members: PlayManagerCitySnapshot['staff']['members'];
  divisionLabel: string;
  maxStaffLevel: number;
  totalWeeklyWagesLabel: string;
  bonuses: PlayManagerCitySnapshot['staff']['bonuses'];
  onBack: () => void;
}) {
  const router = useRouter();
  const categories: StaffCategory[] = ['coaching', 'scouting', 'medical', 'operations'];
  const activeStaffCount = members.filter((member) => member.isHired).length;

  return (
    <div className="space-y-4">
      <BackBar title="პერსონალი" onBack={onBack} />

      <PmCard>
        <PmCardHead icon={ShieldCheck} title="კლუბის პერსონალი" subtitle="Staff" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <NestedMiniBox label="დაქირავებული" value={`${activeStaffCount}/${members.length}`} />
          <NestedMiniBox label="დივიზიონი" value={divisionLabel} />
          <NestedMiniBox label="Level cap" value={`LVL ${maxStaffLevel}`} />
          <NestedMiniBox label="კვირეული cost" value={totalWeeklyWagesLabel} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-white/8 pt-3">
          <PmPill tone="green">Readiness +{bonuses.readinessFlat}</PmPill>
          <PmPill tone="green">Market +{bonuses.marketExtraPlayers}</PmPill>
          <PmPill tone="green">Academy +{bonuses.academyExtraProspects}</PmPill>
          <PmPill tone="green">Income +{bonuses.projectedIncomePct}%</PmPill>
          <PmPill tone="red">Doctor +{bonuses.doctorRecoveryPct}%</PmPill>
          <PmPill tone="red">Physio +{bonuses.physioRecoveryPct}%</PmPill>
          <PmPill>Morale +{bonuses.psychologistMoralePct}%</PmPill>
        </div>
      </PmCard>

      {categories.map((category) => {
        const categoryMembers = members.filter((member) => member.category === category);
        if (categoryMembers.length === 0) return null;
        const meta = CATEGORY_META[category];
        return (
          <PmCard key={category}>
            <PmCardHead icon={meta.icon} title={meta.label} subtitle={`${categoryMembers.length} როლი`} />
            {/* Photo + name only — tap a role to open its page (hire/upgrade lives there). */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categoryMembers.map((member) => (
                <PmPhotoCard
                  key={member.roleKey}
                  title={member.name}
                  photo={getStaffPhoto(member.roleKey)}
                  tone={member.isHired ? 'green' : 'red'}
                  onClick={() => router.push(`/playmanager/staff/${member.roleKey}`)}
                />
              ))}
            </div>
          </PmCard>
        );
      })}
    </div>
  );
}

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-black text-white/70 transition hover:bg-white/10"
      >
        ← საცხოვრებელი ბაზა
      </button>
      <h2 className="pm-office-title text-lg">{title}</h2>
    </div>
  );
}
