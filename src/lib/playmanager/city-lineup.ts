// Pure lineup-selection logic for the city snapshot: given a flat squad, either
// auto-pick the best 4-3-3 (pickBestLineup) or honour the manager's saved slot
// assignments (pickPersistedLineup). No I/O — extracted from city-data.ts so it
// can be unit-tested in isolation.
import type { BaseSquadPlayer, CitySquadPlayer } from './city-data.types';

export const FORMATION_433_TARGETS = ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'] as const;

export function normalizePosition(position: string) {
  const p = position.toUpperCase();
  if (p === 'LCB' || p === 'RCB') return 'CB';
  if (p === 'LCM' || p === 'RCM') return 'CM';
  if (p === 'LWB') return 'LB';
  if (p === 'RWB') return 'RB';
  return p;
}

export function canFillRole(playerPosition: string, targetPosition: string) {
  const position = normalizePosition(playerPosition);
  if (position === targetPosition) return true;
  if (targetPosition === 'CB') return position === 'CB';
  if (targetPosition === 'LB') return position === 'LB' || position === 'CB';
  if (targetPosition === 'RB') return position === 'RB' || position === 'CB';
  if (targetPosition === 'CDM') return position === 'CDM' || position === 'CM';
  if (targetPosition === 'CM') return position === 'CM' || position === 'CAM' || position === 'CDM';
  if (targetPosition === 'LW') return position === 'LW' || position === 'RW' || position === 'CAM';
  if (targetPosition === 'RW') return position === 'RW' || position === 'LW' || position === 'CAM';
  if (targetPosition === 'ST') return position === 'ST' || position === 'CAM' || position === 'LW' || position === 'RW';
  return false;
}

export function pickBestLineup(baseSquad: BaseSquadPlayer[]) {
  const available = [...baseSquad];
  const starters: CitySquadPlayer[] = [];

  FORMATION_433_TARGETS.forEach((targetPosition, index) => {
    const candidateIndex = available.findIndex((player) => canFillRole(player.position, targetPosition));
    const bestIndex = available.reduce((selectedIndex, player, playerIndex) => {
      if (!canFillRole(player.position, targetPosition)) return selectedIndex;
      if (selectedIndex === -1) return playerIndex;
      const selected = available[selectedIndex];
      if (player.ovrCurrent !== selected.ovrCurrent) {
        return player.ovrCurrent > selected.ovrCurrent ? playerIndex : selectedIndex;
      }
      return player.fatigue < selected.fatigue ? playerIndex : selectedIndex;
    }, candidateIndex);

    if (bestIndex === -1) return;
    const [selected] = available.splice(bestIndex, 1);
    starters.push({
      ...selected,
      role: 'starter',
      lineupSlot: index + 1,
    });
  });

  const sortedRemaining = available.sort((left, right) => {
    if (right.ovrCurrent !== left.ovrCurrent) return right.ovrCurrent - left.ovrCurrent;
    return left.fatigue - right.fatigue;
  });

  const bench = sortedRemaining.slice(0, 4).map((player, index) => ({
    ...player,
    role: 'bench' as const,
    lineupSlot: 12 + index,
  }));

  const reserves = sortedRemaining.slice(4).map((player) => ({
    ...player,
    role: 'reserve' as const,
    lineupSlot: null,
  }));

  return {
    starters,
    bench,
    reserves,
    squad: [...starters, ...bench, ...reserves],
  };
}

export function pickPersistedLineup(baseSquad: BaseSquadPlayer[]) {
  const sorted = [...baseSquad].sort((left, right) => (left.lineupSlot ?? 999) - (right.lineupSlot ?? 999));
  const starters = sorted
    .filter((player) => player.lineupSlot !== null && player.lineupSlot <= 11)
    .map((player) => ({ ...player, role: 'starter' as const }));
  const bench = sorted
    .filter((player) => player.lineupSlot !== null && player.lineupSlot >= 12 && player.lineupSlot <= 15)
    .map((player) => ({ ...player, role: 'bench' as const }));
  const reserves = sorted
    .filter((player) => player.lineupSlot === null || player.lineupSlot > 15)
    .map((player) => ({ ...player, role: 'reserve' as const, lineupSlot: player.lineupSlot && player.lineupSlot <= 15 ? null : player.lineupSlot }));

  return {
    starters,
    bench,
    reserves,
    squad: [...starters, ...bench, ...reserves],
  };
}
