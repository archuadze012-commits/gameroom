'use client';

import { startTransition, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  runPlayManagerCityAction,
  type MatchResult,
  type RunCityActionResult,
} from '@/app/playmanager/actions/city-action';
import type { PlayManagerPlayerActionResult } from '@/app/playmanager/actions/action-helpers';
import { getFacilityUpgradeCostGel, isFacilityKey, type CityActionKey } from '@/lib/playmanager/gameplay';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import type { ClubEffectsSummary, ManagerPerk } from '@/lib/playmanager/progression';
// Helpers + types come from the light data module, NOT the 3k-line editor —
// importing them from the editor would pull the whole heavy module back into
// this bundle and defeat the code-split below.
import {
  mergeFacilityState,
  DEFAULT_FACILITY_STATE,
  type EditableCityBuilding,
  type RunCityActionError,
  type PlayerActionError,
} from '@/components/playmanager/city-editor-data';

// Each [building] page renders exactly ONE of these heavy modules (by spriteKey).
// Static imports bundled all four into every building route; next/dynamic gives
// each its own chunk so a visitor downloads only the module their building
// actually renders. SSR stays on (default) so server output is unchanged — this
// splits the client chunks without introducing a blank-screen flash.
const BuildingWorkspace = dynamic(() =>
  import('@/components/playmanager/playmanager-city-editor').then((m) => m.BuildingWorkspace),
);
const PlayManagerOffice = dynamic(() =>
  import('@/components/playmanager/playmanager-office').then((m) => m.PlayManagerOffice),
);
const PlayManagerTraining = dynamic(() =>
  import('@/components/playmanager/playmanager-training').then((m) => m.PlayManagerTraining),
);
const PlayManagerResidence = dynamic(() =>
  import('@/components/playmanager/playmanager-residence').then((m) => m.PlayManagerResidence),
);

type Props = {
  building: EditableCityBuilding;
  initialFacilities: Array<{ spriteKey: string; level: number; progress: number; status: 'active' | 'attention' | 'upgradeable' | 'locked' | 'completed' }>;
  initialArenaView?: 'overview' | 'lineup';
  manager: {
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
  team: {
    name: string;
    balanceLabel: string;
    divisionId: number;
    divisionLabel: string;
    formPercent: number;
  };
  clubEffects: ClubEffectsSummary;
  citySnapshot: PlayManagerCitySnapshot;
};

export function BuildingPageClient({
  building,
  initialFacilities,
  initialArenaView = 'overview',
  manager,
  team,
  clubEffects,
  citySnapshot,
}: Props) {
  const router = useRouter();
  const [facilities, setFacilities] = useState(() => mergeFacilityState(initialFacilities));
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  async function runCityAction(spriteKey: string, action: CityActionKey) {
    const actionId = `${spriteKey}:${action}`;
    setPendingAction(actionId);
    setActionMessage(null);
    const result = await runPlayManagerCityAction({ spriteKey, action });
    setPendingAction(null);
    applyCityActionResult(result);
  }

  async function runPlayerAction(actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) {
    setPendingAction(actionId);
    setActionMessage(null);
    const result = await action();
    setPendingAction(null);
    applyPlayerActionResult(result);
  }

  function applyCityActionResult(result: RunCityActionResult) {
    if (!result.success) {
      const labels: Record<RunCityActionError, string> = {
        unauthenticated: 'სესიას ავტორიზაცია სჭირდება',
        team_missing: 'გუნდი ვერ მოიძებნა',
        invalid_facility: 'შენობა არასწორია',
        insufficient_funds: 'ბალანსი არ არის საკმარისი',
        facility_locked: 'ეს შენობა ჯერ ჩაკეტილია',
        already_done_today: 'დღეს უკვე გაკეთდა · ხვალ ისევ შეიძლება',
        unavailable: 'მოქმედება ჯერ მიუწვდომელია',
      };
      setActionMessage(labels[result.error]);
      return;
    }

    startTransition(() => {
      setFacilities((current) => ({
        ...current,
        [result.facility.spriteKey]: {
          ...(current[result.facility.spriteKey] ?? DEFAULT_FACILITY_STATE[result.facility.spriteKey]),
          level: result.facility.level,
          progress: result.facility.progress,
          status: result.facility.status,
          upgradeCost: isFacilityKey(result.facility.spriteKey)
            ? `${getFacilityUpgradeCostGel(result.facility.spriteKey, result.facility.level).toLocaleString('ka-GE')} ₾`
            : current[result.facility.spriteKey]?.upgradeCost ?? '₾0',
        },
      }));
    });

    if (result.matchResult) {
      setMatchResult(result.matchResult);
      return;
    }

    const parts = [];
    if (result.detail) parts.push(result.detail);
    if (result.reward > 0) parts.push(`+${result.reward.toLocaleString('ka-GE')} ₾`);
    if (result.cost > 0) parts.push(`-${result.cost.toLocaleString('ka-GE')} ₾`);
    setActionMessage(parts.length > 0 ? parts.join(' · ') : 'პროგრესი განახლდა');
  }

  function applyPlayerActionResult(result: PlayManagerPlayerActionResult) {
    if (!result.success) {
      const labels: Record<PlayerActionError, string> = {
        unauthenticated: 'სესიას ავტორიზაცია სჭირდება',
        team_missing: 'გუნდი ვერ მოიძებნა',
        invalid_player: 'მონაცემი არასწორია',
        insufficient_funds: 'ბალანსი არ არის საკმარისი',
        player_unavailable: 'ელემენტი მიუწვდომელია',
        player_owned: 'ეს ელემენტი უკვე დაჯავშნილია',
        insufficient_fodder: 'საკმარისი Pro ბარათი არ არის',
        no_upgrade_available: 'OVR აფგრეიდი მიუწვდომელია',
        unavailable: 'მოქმედება ჯერ მიუწვდომელია',
      };
      setActionMessage(result.message ?? labels[result.error]);
      return;
    }
    startTransition(() => router.refresh());
    setActionMessage(result.amount ? `${result.message} · ${result.amount.toLocaleString('ka-GE')} ₾` : result.message);
  }

  if (building.spriteKey === 'finance') {
    return (
      <div className="relative min-h-screen w-full bg-[#070503]">
        <PlayManagerOffice
          building={building}
          manager={manager}
          team={team}
          snapshot={citySnapshot}
          clubEffects={clubEffects}
          facilities={facilities}
          pendingAction={pendingAction}
          actionMessage={actionMessage}
          onRunAction={runCityAction}
          onRunPlayerAction={runPlayerAction}
        />
      </div>
    );
  }

  if (building.spriteKey === 'residence') {
    return (
      <div className="relative min-h-screen w-full bg-[#05070a]">
        <PlayManagerResidence
          building={building}
          manager={manager}
          team={team}
          snapshot={citySnapshot}
          clubEffects={clubEffects}
          facilities={facilities}
          pendingAction={pendingAction}
          actionMessage={actionMessage}
          onRunAction={runCityAction}
          onRunPlayerAction={runPlayerAction}
        />
      </div>
    );
  }

  if (building.spriteKey === 'training') {
    return (
      <div className="relative min-h-screen w-full bg-[#05070a]">
        <PlayManagerTraining
          building={building}
          manager={manager}
          team={team}
          snapshot={citySnapshot}
          clubEffects={clubEffects}
          facilities={facilities}
          pendingAction={pendingAction}
          actionMessage={actionMessage}
          onRunAction={runCityAction}
          onRunPlayerAction={runPlayerAction}
        />
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full bg-[#020806] ${initialArenaView === 'lineup' ? 'pm-arena-lineup-page' : ''}`}>
      <BuildingWorkspace
        building={building}
        initialArenaView={initialArenaView}
        manager={manager}
        team={team}
        snapshot={citySnapshot}
        clubEffects={clubEffects}
        facility={facilities[building.spriteKey] ?? DEFAULT_FACILITY_STATE[building.spriteKey]}
        facilities={facilities}
        pendingAction={pendingAction}
        actionMessage={actionMessage}
        matchResult={matchResult}
        onDismissMatchResult={() => setMatchResult(null)}
        onRunAction={runCityAction}
        onRunPlayerAction={runPlayerAction}
      />
    </div>
  );
}
