'use client';

import { useRouter } from 'next/navigation';
import { Dumbbell, Zap, Sliders } from 'lucide-react';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';
import { PmCard, PmCardHead, PmPill, PmAction, PmGauge, PmPhotoCard } from '@/components/playmanager/pm-cards';
import { StaffContextGrid } from '@/components/playmanager/staff-context-grid';
import { type EditableCityBuilding } from '@/components/playmanager/playmanager-city-editor';
import { type PlayManagerPlayerActionResult } from '@/app/playmanager/actions';
import { getFacilityUpgradeCostGel, type CityActionKey } from '@/lib/playmanager/gameplay';
import { formatGel } from '@/lib/playmanager/economy';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import type { ClubEffectsSummary, ManagerPerk } from '@/lib/playmanager/progression';

type TrainingManager = {
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

type TrainingTeam = {
  name: string;
  balanceLabel: string;
  divisionId: number;
  divisionLabel: string;
  formPercent: number;
};

type TrainingFacility = {
  level: number;
  progress: number;
  upgradeCost: string;
  nextUnlock: string;
};

export type PlayManagerTrainingProps = {
  building: EditableCityBuilding;
  manager: TrainingManager;
  team: TrainingTeam;
  snapshot: PlayManagerCitySnapshot;
  clubEffects: ClubEffectsSummary;
  facilities: Record<string, TrainingFacility>;
  pendingAction: string | null;
  actionMessage: string | null;
  onRunAction: (spriteKey: string, action: CityActionKey) => void;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
};

const STYLE_KA: Record<string, string> = {
  balanced: 'ბალანსი',
  pressing: 'პრესინგი',
  possession: 'ფლობა',
  counter: 'კონტრა',
};

export function PlayManagerTraining(props: PlayManagerTrainingProps) {
  const { building, manager, team, snapshot, clubEffects, facilities, pendingAction, actionMessage, onRunAction } = props;
  const router = useRouter();

  const facility = facilities.training ?? { level: 1, progress: 0, upgradeCost: '₾0', nextUnlock: '' };
  const trainingBonus = clubEffects.bonuses.trainingXpPct;
  const upgradeCost = getFacilityUpgradeCostGel('training', facility.level);
  const canUpgrade = manager.level >= facility.level + 1;
  const upgradePending = pendingAction === 'training:facility_upgrade';

  // Coaching staff (all 6 coaching-category roles) are managed here in the
  // training centre; medics live in the medical centre, finance/scout in office.
  const coachingStaff = snapshot.staff.members.filter((member) => member.category === 'coaching');

  return (
    <main className="pm-office pm-feedskin pm-hq-shell min-h-screen overflow-x-hidden bg-[#05070a] pb-24 text-white xl:pb-0">
      <PlayManagerSidebar />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1160px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        {actionMessage ? (
          <div className="mb-3 rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        <div className="space-y-4">
            {/* ── CLUB CARD (pinned post) ── */}
            <PmCard>
              <PmCardHead
                icon={Dumbbell}
                title={building.label || 'საწვრთნელი ბაზა'}
                subtitle={`${team.name} · Training Level ${facility.level}`}
                right={<PmPill tone="green">LVL {facility.level}</PmPill>}
              />
              <div className="flex flex-wrap items-center gap-2">
                <PmPill tone="green">მზადყოფნა {snapshot.matchSettings.readiness}%</PmPill>
                <PmPill tone={snapshot.matchSettings.avgMorale >= 60 ? 'green' : 'red'}>
                  მორალი {snapshot.matchSettings.avgMorale}%
                </PmPill>
                <PmPill>ტაქტიკა {STYLE_KA[snapshot.matchSettings.tacticalStyle] ?? snapshot.matchSettings.tacticalStyle}</PmPill>
                <PmPill tone="green">Training bonus +{trainingBonus}%</PmPill>
              </div>
            </PmCard>

            <div className="pubg-loadout-link group block">
              <button
                type="button"
                onClick={() => router.push('/playmanager/arena/lineup')}
                className="pubg-loadout-card relative overflow-hidden w-full h-12 !p-0 flex items-center justify-center gap-2.5 text-sm font-black text-emerald-100 transition-all duration-200"
              >
                <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                <span className="relative z-[1] flex items-center gap-2.5">
                  <Sliders className="h-4 w-4 text-emerald-300" />
                  შემადგენლობა და ტაქტიკა
                </span>
              </button>
            </div>

            {/* ── COACHING STAFF ── player development now lives on each coach's page. */}
            <PmCard>
              <PmCardHead icon={Dumbbell} title="მწვრთნელთა შტაბი" subtitle="Coaching staff" />
              <p className="text-[11px] font-bold leading-5 text-white/45">
                თითოეული მწვრთნელი ავითარებს თავის ჯგუფს — ბარათზე დაჭერით გახსნი მის გვერდს (ვარჯიში, დაქირავება,
                აფგრეიდი). ასისტენტთან — XP მაღაზია და OVR-ის დადასტურება.
              </p>
              <StaffContextGrid members={coachingStaff} />
            </PmCard>

            {/* ── FACILITY PROGRESS + UPGRADE ── */}
            <PmCard>
              <PmCardHead icon={Zap} title="შენობის დონე" subtitle="Facility" />
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
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-100/60">+ვარჯიშის XP ბონუსი · {formatGel(upgradeCost)}</p>
                </div>
                {canUpgrade ? (
                  <PmAction tone="green" disabled={upgradePending} onClick={() => onRunAction('training', 'facility_upgrade')}>
                    {upgradePending ? 'მუშავდება...' : 'გაუმჯობესება'}
                  </PmAction>
                ) : (
                  <PmPill>🔒 Manager Lv {facility.level + 1}</PmPill>
                )}
              </div>
            </PmCard>
          </div>
      </div>

      <PlayManagerBottomNav />
    </main>
  );
}
