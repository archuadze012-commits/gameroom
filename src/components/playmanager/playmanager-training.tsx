'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  Dumbbell,
  Sparkles,
  Zap,
} from 'lucide-react';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';
import { PmCard, PmCardHead, PmPill, PmAction, PmGauge, PmPhotoCard } from '@/components/playmanager/pm-cards';
import {
  getPlayerPotentialForTraining,
  getDevelopmentXpCost,
  type EditableCityBuilding,
} from '@/components/playmanager/playmanager-city-editor';
import { buyPlayManagerXpPack, trainPlayManagerPlayer, type PlayManagerPlayerActionResult } from '@/app/playmanager/actions';
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

const XP_PACKS = [
  { key: 'starter' as const, label: 'Starter Pack', xp: 300, price: '35 000 ₾' },
  { key: 'prep' as const, label: 'Match Prep', xp: 850, price: '90 000 ₾' },
  { key: 'elite' as const, label: 'Elite Camp', xp: 1800, price: '175 000 ₾' },
] as const;

export function PlayManagerTraining(props: PlayManagerTrainingProps) {
  const { building, manager, team, snapshot, clubEffects, facilities, pendingAction, actionMessage, onRunAction, onRunPlayerAction } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get('module');
  const inLab = moduleKey === 'sessions' || moduleKey === 'tactics_lab';

  const facility = facilities.training ?? { level: 1, progress: 0, upgradeCost: '₾0', nextUnlock: '' };
  const trainingBonus = clubEffects.bonuses.trainingXpPct;
  const upgradeCost = getFacilityUpgradeCostGel('training', facility.level);
  const canUpgrade = manager.level >= facility.level + 1;
  const upgradePending = pendingAction === 'training:facility_upgrade';
  const sessionPending = pendingAction === 'training:training_session';

  function openModule(key: string) {
    router.push(`/playmanager/training?module=${key}`, { scroll: false });
  }

  return (
    <main className="pm-office pm-feedskin pm-hq-shell min-h-screen overflow-x-hidden bg-[#05070a] pb-24 text-white xl:pb-0">
      <PlayManagerSidebar />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1160px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        {actionMessage ? (
          <div className="mb-3 rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        {inLab ? (
          <TrainingLabView
            manager={manager}
            snapshot={snapshot}
            trainingBonus={trainingBonus}
            trainingLevel={facility.level}
            pendingAction={pendingAction}
            sessionPending={sessionPending}
            onRunAction={onRunAction}
            onRunPlayerAction={onRunPlayerAction}
            onBack={() => router.push('/playmanager/training', { scroll: false })}
          />
        ) : (
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

            {/* ── DEPARTMENTS (photo feed cards) ── */}
            {/* Mobile: 2-per-row (even count → no full-width first). */}
            <div className="grid grid-cols-2 gap-4">
              <PmPhotoCard
                icon={Dumbbell}
                title="სავარჯიშო სესიები"
                photo="/playmanager/city/buildings/training.webp"
                pill="Growth"
                tone="green"
                onClick={() => openModule('sessions')}
              />
              <PmPhotoCard
                icon={Activity}
                title="ტაქტიკის ლაბი"
                photo="/playmanager/module-cards/arena/lineup-tactics.webp"
                pill="Coverage"
                tone="green"
                onClick={() => openModule('tactics_lab')}
              />
            </div>

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
        )}
      </div>

      <PlayManagerBottomNav />
    </main>
  );
}

// ── Training Lab (development XP) module ─────────────────────────────────────

function TrainingLabView({
  manager,
  snapshot,
  trainingBonus,
  trainingLevel,
  pendingAction,
  sessionPending,
  onRunAction,
  onRunPlayerAction,
  onBack,
}: {
  manager: TrainingManager;
  snapshot: PlayManagerCitySnapshot;
  trainingBonus: number;
  trainingLevel: number;
  pendingAction: string | null;
  sessionPending: boolean;
  onRunAction: (spriteKey: string, action: CityActionKey) => void;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
  onBack: () => void;
}) {
  const matchXpEarned = snapshot.matchHistory.length * 30;
  const developmentPlayers = snapshot.squad
    .map((player) => {
      const potential = getPlayerPotentialForTraining(player);
      const remainingGrowth = Math.max(0, potential - player.ovrCurrent);
      const totalGrowth = Math.max(1, potential - player.ovrBase);
      const progressPct = Math.min(100, Math.round(((player.ovrCurrent - player.ovrBase) / totalGrowth) * 100));
      return { player, potential, remainingGrowth, progressPct, xpCost: getDevelopmentXpCost(player) };
    })
    .sort((left, right) => {
      if (right.remainingGrowth !== left.remainingGrowth) return right.remainingGrowth - left.remainingGrowth;
      return left.player.age - right.player.age || right.player.ovrCurrent - left.player.ovrCurrent;
    });
  const focusPlayers = developmentPlayers.slice(0, 8);
  const readyToGrowCount = developmentPlayers.filter((item) => item.remainingGrowth > 0 && item.player.availability !== 'injured').length;
  const bestProspect = developmentPlayers[0]?.player.name ?? 'სკაუტინგის შემდეგ გამოჩნდება';

  return (
    <div className="space-y-4">
      <BackBar title="მოთამაშეების განვითარება" onBack={onBack} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <PmCard className="items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">დაგროვებული XP</p>
          <p className="pm-office-title mt-1 text-2xl">{manager.xp.toLocaleString('en-US')}</p>
        </PmCard>
        <PmCard className="items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">მატჩებიდან</p>
          <p className="pm-office-title mt-1 text-2xl">+{matchXpEarned.toLocaleString('en-US')}</p>
        </PmCard>
        <PmCard className="items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Training bonus</p>
          <p className="pm-office-title mt-1 text-2xl">+{trainingBonus}%</p>
        </PmCard>
        <PmCard className="items-center text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">ზრდის კანდიდატი</p>
          <p className="pm-office-title mt-1 text-2xl">{readyToGrowCount}</p>
        </PmCard>
      </div>

      <PmCard>
        <PmCardHead
          icon={Sparkles}
          title={bestProspect}
          subtitle="Focus player"
        />
        <p className="text-xs font-bold leading-5 text-white/54">
          პირველ რიგში გააძლიერე მაღალი პოტენციალის მოთამაშეები და ისინი, ვინც ხშირად თამაშობენ.
        </p>
        <PmAction tone="green" disabled={sessionPending} onClick={() => onRunAction('training', 'training_session')} className="w-full justify-center">
          {sessionPending ? 'სესია მიმდინარეობს...' : 'გუნდური სესია · XP +22'}
        </PmAction>
      </PmCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {focusPlayers.map(({ player, potential, remainingGrowth, progressPct, xpCost }) => {
            const trainPending = pendingAction === `train:${player.id}`;
            const blocked = player.availability === 'injured' || remainingGrowth <= 0;
            return (
              <PmCard key={player.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">{player.name}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                      {player.position} · {player.age} წლის · Talent {player.talent}
                    </p>
                  </div>
                  <PmPill tone="green">{player.ovrCurrent}</PmPill>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PmPill>Potential {potential}</PmPill>
                  <PmPill tone="green">+{remainingGrowth}</PmPill>
                  <PmPill tone="red">XP {xpCost}</PmPill>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] font-black text-white/44">
                    <span>განვითარება</span>
                    <span>{progressPct}%</span>
                  </div>
                  <PmGauge percent={progressPct} className="mt-1.5" />
                </div>
                <PmAction
                  tone="green"
                  disabled={trainPending || blocked}
                  onClick={() => onRunPlayerAction(`train:${player.id}`, () => trainPlayManagerPlayer(player.id))}
                  className="w-full justify-center"
                >
                  {trainPending
                    ? 'ვითარდება...'
                    : player.availability === 'injured'
                      ? 'ტრავმირებულია'
                      : remainingGrowth <= 0
                        ? 'პოტენციალი შევსებულია'
                        : 'XP-ის გამოყენება · OVR +1'}
                </PmAction>
              </PmCard>
            );
          })}
        </div>

        <div className="space-y-3">
          <PmCard>
            <PmCardHead icon={Sparkles} title="დაჩქარებული განვითარება" subtitle="XP Shop" />
            <p className="text-xs font-bold leading-5 text-white/52">
              იყიდე XP პაკეტი, რომ მოთამაშეების განვითარება დააჩქარო. თანხა და XP ერთ transaction-ში მუშავდება.
            </p>
            <div className="space-y-2">
              {XP_PACKS.map((pack) => {
                const buyPending = pendingAction === `xp_pack:${pack.key}`;
                return (
                  <div key={pack.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/28 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-black text-white">{pack.label}</p>
                      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                        +{pack.xp} XP · {pack.price}
                      </p>
                    </div>
                    <PmAction
                      tone="green"
                      disabled={buyPending}
                      onClick={() => onRunPlayerAction(`xp_pack:${pack.key}`, () => buyPlayManagerXpPack(pack.key))}
                    >
                      {buyPending ? 'ვმუშავდები...' : 'ყიდვა'}
                    </PmAction>
                  </div>
                );
              })}
            </div>
          </PmCard>

          <PmCard>
            <PmCardHead icon={Activity} title="Development rules" />
            <div className="space-y-2 text-xs font-bold leading-5 text-white/52">
              <p>მატჩი უნდა იყოს მთავარი XP წყარო, რადგან სათამაშო დრო განვითარებას ბუნებრივად აკავშირებს.</p>
              <p>Shop XP უნდა აჩქარებდეს პროცესს, მაგრამ პოტენციალს არ უნდა აჭარბებდეს.</p>
              <p>Training Level {trainingLevel} ზრდის XP-ის ეფექტს: ახლა +{trainingBonus}%.</p>
            </div>
          </PmCard>
        </div>
      </div>
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
        ← წვრთნის ბაზა
      </button>
      <h2 className="pm-office-title text-lg">{title}</h2>
    </div>
  );
}
