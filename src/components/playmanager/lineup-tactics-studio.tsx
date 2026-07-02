'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eraser,
  Save,
  Sparkles,
  UserMinus,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import {
  DEFAULT_FUT_CARD_EDITOR_CONFIG,
  PlayerFutCard,
} from '@/components/playmanager/player-fut-card';
import { LineupTacticControls } from '@/components/playmanager/lineup-tactic-controls';
import {
  savePlayManagerLineupFormation,
  savePlayManagerMatchSettings,
} from '@/app/playmanager/actions';
import {
  PRESET_FORMATIONS,
  type MatchTactics,
} from '@/lib/playmanager/formations';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import {
  getSuggestedSecondaryPositions,
  normalizePlayManagerPosition,
} from '@/lib/playmanager/secondary-positions';

type StudioPlayer = PlayManagerCitySnapshot['starters'][number];
type PositionStatus = 'natural' | 'secondary' | 'tertiary' | 'out-of-position';

const CARD_W = 250;
const CARD_H = 345;

const STATUS_RING: Record<PositionStatus, string> = {
  natural: 'shadow-[0_0_0_1.5px_rgba(52,211,153,0.55)]',
  secondary: 'shadow-[0_0_0_1.5px_rgba(190,242,100,0.5)]',
  tertiary: 'shadow-[0_0_0_1.5px_rgba(251,146,60,0.5)]',
  'out-of-position': 'shadow-[0_0_0_1.5px_rgba(248,113,113,0.55)]',
};

function getPositionStatus(playerPosition: string, slotLabel: string): PositionStatus {
  const player = normalizePlayManagerPosition(playerPosition);
  const slot = normalizePlayManagerPosition(slotLabel);
  if (player === slot) return 'natural';
  const secondary = getSuggestedSecondaryPositions(player);
  if (secondary.includes(slot)) return 'secondary';
  const tertiary = secondary
    .flatMap((entry) => getSuggestedSecondaryPositions(entry))
    .filter((entry) => entry !== player && !secondary.includes(entry));
  if (tertiary.includes(slot)) return 'tertiary';
  return 'out-of-position';
}

type Board = {
  slots: Array<StudioPlayer | null>;
  bench: StudioPlayer[];
  reserves: StudioPlayer[];
};

function detach(board: Board, playerId: string): { board: Board; player: StudioPlayer | null } {
  let player: StudioPlayer | null = null;
  const slots = board.slots.map((slot) => {
    if (slot && slot.id === playerId) {
      player = slot;
      return null;
    }
    return slot;
  });
  const bench = board.bench.filter((entry) => {
    if (entry.id === playerId) {
      player = entry;
      return false;
    }
    return true;
  });
  const reserves = board.reserves.filter((entry) => {
    if (entry.id === playerId) {
      player = entry;
      return false;
    }
    return true;
  });
  return { board: { slots, bench, reserves }, player };
}

type Location = { zone: 'slot'; index: number } | { zone: 'bench' | 'reserve' };

function locate(board: Board, id: string): Location | null {
  const slotIndex = board.slots.findIndex((slot) => slot?.id === id);
  if (slotIndex >= 0) return { zone: 'slot', index: slotIndex };
  if (board.bench.some((entry) => entry.id === id)) return { zone: 'bench' };
  if (board.reserves.some((entry) => entry.id === id)) return { zone: 'reserve' };
  return null;
}

function findPlayer(board: Board, id: string): StudioPlayer | null {
  return (
    board.slots.find((slot): slot is StudioPlayer => Boolean(slot && slot.id === id)) ??
    board.bench.find((entry) => entry.id === id) ??
    board.reserves.find((entry) => entry.id === id) ??
    null
  );
}

function removeIds(board: Board, ids: Set<string>): Board {
  return {
    slots: board.slots.map((slot) => (slot && ids.has(slot.id) ? null : slot)),
    bench: board.bench.filter((entry) => !ids.has(entry.id)),
    reserves: board.reserves.filter((entry) => !ids.has(entry.id)),
  };
}

function putAt(board: Board, player: StudioPlayer, loc: Location): Board {
  if (loc.zone === 'slot') {
    const slots = [...board.slots];
    slots[loc.index] = { ...player, role: 'starter' };
    return { ...board, slots };
  }
  if (loc.zone === 'bench') return { ...board, bench: [...board.bench, { ...player, role: 'bench' }] };
  return { ...board, reserves: [...board.reserves, { ...player, role: 'reserve' }] };
}

export function LineupTacticsStudio({
  team,
  squad,
  matchSettings,
  formPercent,
}: {
  team: { name: string; divisionLabel: string; balanceLabel: string };
  squad: { starters: StudioPlayer[]; bench: StudioPlayer[]; reserves: StudioPlayer[] };
  matchSettings: MatchTactics & { readiness: number };
  formPercent: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [board, setBoard] = useState<Board>(() => ({
    slots: Array.from({ length: 11 }, (_, index) => squad.starters[index] ?? null),
    bench: [...squad.bench],
    reserves: [...squad.reserves],
  }));
  const [formation, setFormation] = useState('4-3-3');
  const [tactics, setTactics] = useState<MatchTactics>({
    tacticalStyle: matchSettings.tacticalStyle,
    defensiveLine: matchSettings.defensiveLine,
    tempo: matchSettings.tempo,
    focusSide: matchSettings.focusSide,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);

  const slotDefs = PRESET_FORMATIONS[formation] ?? PRESET_FORMATIONS['4-3-3'];
  const starters = board.slots.filter((slot): slot is StudioPlayer => Boolean(slot));
  const starterCount = starters.length;
  const avgOvr = starterCount
    ? Math.round(starters.reduce((sum, player) => sum + player.ovrCurrent, 0) / starterCount)
    : 0;
  const selectedPlayer = useMemo(
    () =>
      [...starters, ...board.bench, ...board.reserves].find((player) => player.id === selectedId) ?? null,
    [starters, board.bench, board.reserves, selectedId],
  );
  const selectedSlotIndex = board.slots.findIndex((slot) => slot && slot.id === selectedId);

  function placeInSlot(playerId: string, slotIndex: number) {
    setBoard((prev) => {
      const { board: next, player } = detach(prev, playerId);
      if (!player) return prev;
      const occupant = next.slots[slotIndex];
      const slots = [...next.slots];
      slots[slotIndex] = { ...player, role: 'starter' };
      const bench = occupant ? [{ ...occupant, role: 'bench' as const }, ...next.bench] : next.bench;
      return { slots, bench, reserves: next.reserves };
    });
  }

  function moveToList(playerId: string, target: 'bench' | 'reserve') {
    setBoard((prev) => {
      const { board: next, player } = detach(prev, playerId);
      if (!player) return prev;
      if (target === 'bench') return { ...next, bench: [...next.bench, { ...player, role: 'bench' }] };
      return { ...next, reserves: [...next.reserves, { ...player, role: 'reserve' }] };
    });
  }

  function autoPlace(playerId: string) {
    const player = [...board.bench, ...board.reserves].find((entry) => entry.id === playerId);
    if (!player) return;
    const emptyIndexes = slotDefs.map((slot) => slot.index).filter((index) => !board.slots[index]);
    if (emptyIndexes.length === 0) return;
    const rank: Record<PositionStatus, number> = { natural: 0, secondary: 1, tertiary: 2, 'out-of-position': 3 };
    const best = emptyIndexes
      .map((index) => {
        const def = slotDefs.find((slot) => slot.index === index)!;
        return { index, score: rank[getPositionStatus(player.position, def.label)] };
      })
      .sort((left, right) => left.score - right.score)[0];
    placeInSlot(playerId, best.index);
    setSelectedId(playerId);
  }

  // Select a card; if one is already selected, the two swap places (the picked
  // card takes the clicked card's spot, and vice-versa) — anywhere on the board.
  function onCardClick(id: string) {
    if (!selectedId) {
      setSelectedId(id);
      return;
    }
    if (selectedId === id) {
      setSelectedId(null);
      return;
    }
    const pickedId = selectedId;
    setBoard((prev) => {
      const picked = findPlayer(prev, pickedId);
      const target = findPlayer(prev, id);
      const pickedLoc = locate(prev, pickedId);
      const targetLoc = locate(prev, id);
      if (!picked || !target || !pickedLoc || !targetLoc) return prev;
      let next = removeIds(prev, new Set([pickedId, id]));
      next = putAt(next, picked, targetLoc);
      next = putAt(next, target, pickedLoc);
      return next;
    });
    setSelectedId(null);
  }

  function onSlotClick(slotIndex: number) {
    const occupant = board.slots[slotIndex];
    if (occupant) {
      onCardClick(occupant.id);
      return;
    }
    if (selectedId) {
      placeInSlot(selectedId, slotIndex);
      setSelectedId(null);
      return;
    }
    setPickerSlot(slotIndex);
  }

  // Logically fill the XI by position fit + rating: best keeper to GK, best
  // defenders to the back line, and so on; the rest fall to bench/reserves.
  function autoArrange() {
    setBoard((prev) => {
      const pool = [...prev.slots.filter((slot): slot is StudioPlayer => Boolean(slot)), ...prev.bench, ...prev.reserves];
      const slots: Array<StudioPlayer | null> = Array.from({ length: 11 }, () => null);
      const rank: Record<PositionStatus, number> = { natural: 0, secondary: 1, tertiary: 2, 'out-of-position': 3 };
      const order = [...slotDefs].sort((left, right) => right.top - left.top);
      for (const slot of order) {
        let bestIndex = -1;
        let bestScore = Number.POSITIVE_INFINITY;
        for (let i = 0; i < pool.length; i += 1) {
          const score = rank[getPositionStatus(pool[i].position, slot.label)] * 1000 - pool[i].ovrCurrent;
          if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }
        if (bestIndex >= 0) {
          slots[slot.index] = { ...pool[bestIndex], role: 'starter' };
          pool.splice(bestIndex, 1);
        }
      }
      const rest = pool.sort((left, right) => right.ovrCurrent - left.ovrCurrent);
      const benchCount = Math.min(7, rest.length);
      return {
        slots,
        bench: rest.slice(0, benchCount).map((player) => ({ ...player, role: 'bench' as const })),
        reserves: rest.slice(benchCount).map((player) => ({ ...player, role: 'reserve' as const })),
      };
    });
    setSelectedId(null);
  }

  function clearPitch() {
    setBoard((prev) => {
      const starters = prev.slots.filter((slot): slot is StudioPlayer => Boolean(slot));
      return {
        slots: Array.from({ length: 11 }, () => null),
        bench: [...prev.bench, ...starters.map((player) => ({ ...player, role: 'bench' as const }))],
        reserves: prev.reserves,
      };
    });
    setSelectedId(null);
  }

  function save() {
    setToast(null);
    startTransition(async () => {
      // Starters carry their formation slot label (board.slots index → slotDefs);
      // bench/reserves carry no slot (position is left untouched for them).
      const slots: { playerId: string; slot: string | null }[] = [];
      board.slots.forEach((player, index) => {
        if (player) slots.push({ playerId: player.id, slot: slotDefs[index]?.label ?? null });
      });
      for (const player of [...board.bench, ...board.reserves]) {
        slots.push({ playerId: player.id, slot: null });
      }
      const lineupResult = await savePlayManagerLineupFormation(formation, slots);
      if (!lineupResult.success) {
        setToast({ ok: false, message: 'შემადგენლობა ვერ შეინახა' });
        return;
      }
      const settingsResult = await savePlayManagerMatchSettings(tactics);
      setToast(
        settingsResult.success
          ? { ok: true, message: 'შემადგენლობა და ტაქტიკა შენახულია' }
          : { ok: false, message: 'ტაქტიკა ვერ შეინახა' },
      );
      router.refresh();
    });
  }

  return (
    <main className="pm-lineup-studio relative min-h-[100dvh] w-full overflow-x-hidden bg-[#04100a] pb-12 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(110%_80%_at_50%_-10%,rgba(16,185,129,0.18),transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-[1380px] px-3 py-4 sm:px-5 lg:px-7">
        <CommandBar
          team={team}
          formation={formation}
          starterCount={starterCount}
          avgOvr={avgOvr}
          readiness={matchSettings.readiness}
          formPercent={formPercent}
          pending={pending}
          onSave={save}
        />

        <LayoutGroup>
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_372px]">
            <div className="space-y-4">
              <div className="pm-facility-module pm-facility-module-tone-green flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-white/45">
                  {selectedId
                    ? 'დააკლიკე სხვა ფუტქარდს — ადგილებს გაცვლიან'
                    : 'მონიშნე ფუტქარდი, მერე დააკლიკე სასურველ პოზიციას'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={autoArrange}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/24 bg-emerald-300/12 px-3 py-1.5 text-[11px] font-black text-emerald-50 transition hover:bg-emerald-300/20"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    ავტო-განლაგება
                  </button>
                  <button
                    type="button"
                    onClick={clearPitch}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black text-white/65 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-50"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    გასუფთავება
                  </button>
                </div>
              </div>

              <PitchCard
                slotDefs={slotDefs}
                board={board}
                selectedId={selectedId}
                onSlotClick={onSlotClick}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SquadShelf
                  title="სათადარიგო"
                  icon={<Users className="h-3.5 w-3.5" />}
                  players={board.bench}
                  selectedId={selectedId}
                  onSelect={onCardClick}
                />
                <SquadShelf
                  title="რეზერვი"
                  icon={<Users className="h-3.5 w-3.5" />}
                  players={board.reserves}
                  selectedId={selectedId}
                  onSelect={onCardClick}
                />
              </div>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[24px] border border-emerald-300/14 bg-[linear-gradient(180deg,rgba(6,20,13,0.95),rgba(3,11,7,0.96))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.4)]">
                <LineupTacticControls
                  formation={formation}
                  tactics={tactics}
                  onFormationChange={setFormation}
                  onTacticChange={(key, value) => setTactics((current) => ({ ...current, [key]: value }))}
                />
              </section>

              <SelectedDetail
                player={selectedPlayer}
                slotLabel={
                  selectedSlotIndex >= 0
                    ? slotDefs.find((slot) => slot.index === selectedSlotIndex)?.label ?? null
                    : null
                }
                onBench={(id) => moveToList(id, 'bench')}
                onReserve={(id) => moveToList(id, 'reserve')}
                onAutoPlace={autoPlace}
                onClear={() => setSelectedId(null)}
              />
            </aside>
          </div>
        </LayoutGroup>
      </div>

      <AnimatePresence>
        {pickerSlot !== null ? (
          <SlotPicker
            slotLabel={slotDefs.find((slot) => slot.index === pickerSlot)?.label ?? ''}
            players={[...board.bench, ...board.reserves]}
            onPick={(id) => {
              placeInSlot(id, pickerSlot);
              setSelectedId(id);
              setPickerSlot(null);
            }}
            onClose={() => setPickerSlot(null)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            onAnimationComplete={() => window.setTimeout(() => setToast(null), 2200)}
            className={`fixed inset-x-0 bottom-5 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border px-5 py-3 text-sm font-black shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
              toast.ok
                ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-50'
                : 'border-red-400/40 bg-red-500/15 text-red-50'
            }`}
          >
            {toast.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function CommandBar({
  team,
  formation,
  starterCount,
  avgOvr,
  readiness,
  formPercent,
  pending,
  onSave,
}: {
  team: { name: string; divisionLabel: string; balanceLabel: string };
  formation: string;
  starterCount: number;
  avgOvr: number;
  readiness: number;
  formPercent: number;
  pending: boolean;
  onSave: () => void;
}) {
  const complete = starterCount === 11;
  return (
    <header className="pm-facility-module pm-facility-module-tone-green flex flex-wrap items-center gap-3 backdrop-blur-xl">
      <Link
        href="/playmanager/arena?module=matchday"
        className="grid h-11 w-11 flex-none place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-white"
        aria-label="არენაზე დაბრუნება"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/60">
          Squad &amp; tactics
        </p>
        <h1 className="truncate text-xl font-black leading-tight sm:text-2xl">შემადგენლობა და ტაქტიკა</h1>
        <p className="mt-0.5 truncate text-xs font-bold text-white/45">
          {team.name} · {team.divisionLabel} · {team.balanceLabel}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Pill label="ფორმაცია" value={formation} />
        <Pill label="OVR" value={avgOvr ? String(avgOvr) : '—'} />
        <Pill label="XI" value={`${starterCount}/11`} tone={complete ? 'emerald' : 'amber'} />
        <ReadinessRing readiness={readiness} formPercent={formPercent} />
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !complete}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200/30 bg-[linear-gradient(180deg,#6ee7b7,#34d399)] px-4 text-sm font-black text-emerald-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-none disabled:bg-white/10 disabled:text-white/35"
          title={complete ? 'შენახვა' : 'დააკომპლექტე XI (11/11)'}
        >
          <Save className="h-4 w-4" />
          {pending ? 'ინახება…' : 'შენახვა'}
        </button>
      </div>
    </header>
  );
}

function Pill({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'emerald' | 'amber' }) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
      : tone === 'amber'
        ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
        : 'border-white/10 bg-white/[0.04] text-white/70';
  return (
    <div className={`hidden flex-col items-center rounded-2xl border px-3 py-1.5 sm:flex ${toneClass}`}>
      <span className="text-[8px] font-black uppercase tracking-[0.16em] opacity-70">{label}</span>
      <span className="text-sm font-black tabular-nums">{value}</span>
    </div>
  );
}

function ReadinessRing({ readiness, formPercent }: { readiness: number; formPercent: number }) {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, readiness)) / 100) * circumference;
  return (
    <div className="relative hidden h-12 w-12 flex-none place-items-center sm:grid" title={`მზადყოფნა ${readiness}% · ფორმა ${formPercent}%`}>
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="url(#pm-readiness)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <defs>
          <linearGradient id="pm-readiness" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[11px] font-black tabular-nums text-emerald-100">{readiness}</span>
    </div>
  );
}

function PitchCard({
  slotDefs,
  board,
  selectedId,
  onSlotClick,
}: {
  slotDefs: (typeof PRESET_FORMATIONS)[string];
  board: Board;
  selectedId: string | null;
  onSlotClick: (slotIndex: number) => void;
}) {
  return (
    <section className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-[28px] border border-emerald-200/18 bg-[linear-gradient(180deg,#0a4a2a,#0c5733_52%,#093f24)] shadow-[0_28px_80px_rgba(0,0,0,0.45),inset_0_0_70px_rgba(0,0,0,0.28)]">
      <PitchMarkings />
      <div className="relative aspect-[10/13] w-full">
        {slotDefs.map((slot) => {
          const player = board.slots[slot.index];
          const top = 5 + (slot.top / 100) * 90;
          const left = 6 + (slot.left / 100) * 88;
          const status = player ? getPositionStatus(player.position, slot.label) : 'natural';
          const selected = Boolean(player && player.id === selectedId);
          return (
            <div
              key={`${slot.label}-${slot.index}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${top}%`, left: `${left}%` }}
            >
              {player ? (
                <motion.button
                  layout
                  layoutId={player.id}
                  type="button"
                  onClick={() => onSlotClick(slot.index)}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className={`group relative grid place-items-center rounded-2xl ${STATUS_RING[status]} ${
                    selected ? 'ring-2 ring-emerald-300/80 ring-offset-2 ring-offset-transparent' : ''
                  }`}
                  style={{ width: CARD_W * 0.34, height: CARD_H * 0.34 }}
                >
                  <ScaledCard player={player} scale={0.34} status={status} />
                  <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/72 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white/80">
                    {slot.label}
                  </span>
                </motion.button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSlotClick(slot.index)}
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/35 bg-black/25 text-white/65 transition hover:border-emerald-200/70 hover:bg-emerald-300/10 hover:text-emerald-50"
                  style={{ width: CARD_W * 0.34, height: CARD_H * 0.34 }}
                >
                  <span className="text-lg leading-none opacity-70">+</span>
                  <span className="mt-1 text-[9px] font-black uppercase tracking-[0.12em]">{slot.label}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 opacity-90">
      <div className="absolute inset-0 [background:repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_9%,transparent_9%,transparent_18%)]" />
      <div className="absolute inset-[3.5%] rounded-[18px] border border-white/45" />
      <div className="absolute inset-x-[3.5%] top-1/2 h-px -translate-y-1/2 bg-white/45" />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" />
      <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
      <div className="absolute bottom-[3.5%] left-1/2 h-[15%] w-[54%] -translate-x-1/2 rounded-t-none border border-b-0 border-white/45" />
      <div className="absolute top-[3.5%] left-1/2 h-[15%] w-[54%] -translate-x-1/2 border border-t-0 border-white/45" />
      <div className="absolute bottom-[3.5%] left-1/2 h-[6%] w-[26%] -translate-x-1/2 border border-b-0 border-white/45" />
      <div className="absolute top-[3.5%] left-1/2 h-[6%] w-[26%] -translate-x-1/2 border border-t-0 border-white/45" />
    </div>
  );
}

function ScaledCard({
  player,
  scale,
  status,
}: {
  player: StudioPlayer;
  scale: number;
  status?: PositionStatus;
}) {
  return (
    <div className="pointer-events-none relative overflow-hidden rounded-2xl" style={{ width: CARD_W * scale, height: CARD_H * scale }}>
      <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <PlayerFutCard
          name={player.name}
          labelOverride={player.cardDisplayName}
          imageUrl={player.cardImageUrl}
          nationalityCode={player.nationalityCode}
          stats={player.stats}
          position={player.position}
          ovr={player.ovrCurrent}
          role={player.role}
          availability={player.availability}
          talent={player.talent}
          positionStatus={status ?? 'natural'}
          editorConfig={player.cardEditorConfig ?? DEFAULT_FUT_CARD_EDITOR_CONFIG}
        />
      </div>
    </div>
  );
}

function SquadShelf({
  title,
  icon,
  players,
  selectedId,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  players: StudioPlayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,20,14,0.9),rgba(3,9,7,0.95))] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
          {icon}
          {title}
        </p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black text-white/55">
          {players.length}
        </span>
      </div>
      {players.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {players.map((player) => (
            <motion.button
              key={player.id}
              layout
              layoutId={player.id}
              type="button"
              onClick={() => onSelect(player.id)}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`relative flex-none rounded-2xl transition ${
                selectedId === player.id ? 'ring-2 ring-emerald-300/70 ring-offset-2 ring-offset-transparent' : ''
              }`}
              style={{ width: CARD_W * 0.32, height: CARD_H * 0.32 }}
            >
              <ScaledCard player={player} scale={0.32} />
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="grid h-[92px] place-items-center rounded-2xl border border-dashed border-white/10 text-[11px] font-black text-white/30">
          ცარიელია
        </div>
      )}
    </section>
  );
}

function SelectedDetail({
  player,
  slotLabel,
  onBench,
  onReserve,
  onAutoPlace,
  onClear,
}: {
  player: StudioPlayer | null;
  slotLabel: string | null;
  onBench: (id: string) => void;
  onReserve: (id: string) => void;
  onAutoPlace: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,18,12,0.95),rgba(3,10,7,0.96))] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/60">არჩეული</p>
        {player ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black text-white/55 transition hover:text-white"
          >
            გასუფთავება
          </button>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {player ? (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center"
          >
            <Link href={`/playmanager/players/${player.id}`} className="block transition-transform hover:scale-[1.02]">
              <div style={{ width: CARD_W * 0.62, height: CARD_H * 0.62 }} className="relative overflow-hidden">
                <div style={{ width: CARD_W, height: CARD_H, transform: 'scale(0.62)', transformOrigin: 'top left' }}>
                  <PlayerFutCard
                    name={player.name}
                    labelOverride={player.cardDisplayName}
                    imageUrl={player.cardImageUrl}
                    nationalityCode={player.nationalityCode}
                    stats={player.stats}
                    position={player.position}
                    ovr={player.ovrCurrent}
                    role={player.role}
                    availability={player.availability}
                    talent={player.talent}
                    positionStatus={slotLabel ? getPositionStatus(player.position, slotLabel) : 'natural'}
                    editorConfig={player.cardEditorConfig ?? DEFAULT_FUT_CARD_EDITOR_CONFIG}
                  />
                </div>
              </div>
            </Link>

            <div className="mt-3 flex items-center gap-2 text-xs font-black text-white/70">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{player.position}</span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
                {player.ovrCurrent} OVR
              </span>
              {slotLabel ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">@ {slotLabel}</span>
              ) : null}
            </div>

            <div className="mt-3 grid w-full grid-cols-3 gap-2">
              <DetailAction
                icon={<Sparkles className="h-4 w-4" />}
                label="XI-ში"
                onClick={() => onAutoPlace(player.id)}
                disabled={player.role === 'starter'}
              />
              <DetailAction
                icon={<ChevronRight className="h-4 w-4" />}
                label="სათადარიგო"
                onClick={() => onBench(player.id)}
                disabled={player.role === 'bench'}
              />
              <DetailAction
                icon={<UserMinus className="h-4 w-4" />}
                label="რეზერვი"
                onClick={() => onReserve(player.id)}
                disabled={player.role === 'reserve'}
              />
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-xs font-bold leading-relaxed text-white/40"
          >
            აირჩიე მოთამაშე მოედანზე ან სკამზე —<br />აქ გამოჩნდება ბარათი და სწრაფი მოქმედებები
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

function DetailAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2.5 text-[10px] font-black text-white/70 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-emerald-50 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {icon}
      {label}
    </button>
  );
}

function SlotPicker({
  slotLabel,
  players,
  onPick,
  onClose,
}: {
  slotLabel: string;
  players: StudioPlayer[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const sorted = useMemo(
    () =>
      [...players].sort((left, right) => {
        const rank: Record<PositionStatus, number> = { natural: 0, secondary: 1, tertiary: 2, 'out-of-position': 3 };
        return (
          rank[getPositionStatus(left.position, slotLabel)] - rank[getPositionStatus(right.position, slotLabel)] ||
          right.ovrCurrent - left.ovrCurrent
        );
      }),
    [players, slotLabel],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[26px] border border-emerald-300/18 bg-[#05130d] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/50">ცარიელი პოზიცია</p>
            <p className="mt-0.5 text-sm font-black text-white">{slotLabel} — აირჩიე მოთამაშე</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {sorted.length > 0 ? (
            sorted.map((player) => {
              const status = getPositionStatus(player.position, slotLabel);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onPick(player.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-emerald-300/24 hover:bg-emerald-300/8"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-white">{player.name}</strong>
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                      {player.position} · {player.role === 'bench' ? 'სათადარიგო' : 'რეზერვი'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <FitDot status={status} />
                    <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-xs font-black text-white">
                      {player.ovrCurrent}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-xs font-bold text-white/40">
              სკამზე მოთამაშე არ არის
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FitDot({ status }: { status: PositionStatus }) {
  const color =
    status === 'natural'
      ? 'bg-emerald-400'
      : status === 'secondary'
        ? 'bg-lime-300'
        : status === 'tertiary'
          ? 'bg-orange-400'
          : 'bg-red-400';
  return <span className={`h-2 w-2 rounded-full ${color}`} title={status} />;
}
