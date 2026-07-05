'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition, type DragEvent, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Gauge,
  Save,
  Shield,
  UsersRound,
  Zap,
} from 'lucide-react';
import {
  DEFENSIVE_LINE_OPTIONS,
  FOCUS_SIDE_OPTIONS,
  TACTICAL_STYLE_OPTIONS,
  TEMPO_OPTIONS,
} from '@/lib/playmanager/formations';
import {
  DEFAULT_FUT_CARD_EDITOR_CONFIG,
  PlayerFutCard,
} from '@/components/playmanager/player-fut-card';
import {
  savePlayManagerLineup,
  savePlayManagerMatchSettings,
} from '@/app/playmanager/actions/squad-settings-actions';

export type CupWorkbenchPlayer = {
  id: string;
  name: string;
  position: string;
  ovr: number;
  fatigue: number;
  morale: number;
  injuryMatches: number;
  availability: 'ready' | 'injured';
  talent: number;
};

export type CupWorkbenchSettings = {
  tacticalStyle: 'balanced' | 'pressing' | 'possession' | 'counter';
  defensiveLine: 'low' | 'mid' | 'high';
  tempo: 'controlled' | 'balanced' | 'direct';
  focusSide: 'left' | 'center' | 'right';
};

export type CupWorkbenchTeam = {
  id: string;
  name: string;
  starters: CupWorkbenchPlayer[];
  bench: CupWorkbenchPlayer[];
  reserves: CupWorkbenchPlayer[];
  avgOvr: number;
  avgMorale: number;
  avgFatigue: number;
  injuredCount: number;
  settings: CupWorkbenchSettings;
};

type DragPayload =
  | { playerId: string; source: 'starter'; slotIndex: number }
  | { playerId: string; source: 'bench' | 'reserve' };

const PITCH_SLOTS = [
  { label: 'GK', top: 85, left: 50 },
  { label: 'LB', top: 62, left: 16 },
  { label: 'CB', top: 64, left: 38 },
  { label: 'CB', top: 64, left: 62 },
  { label: 'RB', top: 62, left: 84 },
  { label: 'CDM', top: 48, left: 50 },
  { label: 'CM', top: 36, left: 34 },
  { label: 'CM', top: 36, left: 66 },
  { label: 'LW', top: 18, left: 18 },
  { label: 'ST', top: 14, left: 50 },
  { label: 'RW', top: 18, left: 82 },
];


export function CupMatchLineupWorkbench({
  own,
  opponent,
  tips,
  canEdit,
}: {
  own: CupWorkbenchTeam;
  opponent: CupWorkbenchTeam;
  tips: string[];
  canEdit: boolean;
}) {
  const [starterSlots, setStarterSlots] = useState<Array<CupWorkbenchPlayer | null>>(() =>
    Array.from({ length: 11 }, (_, index) => own.starters[index] ?? null),
  );
  const [bench, setBench] = useState(() => own.bench);
  const [reserves, setReserves] = useState(() => own.reserves);
  const [settings, setSettings] = useState<CupWorkbenchSettings>(own.settings);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Touch-friendly alternative to native HTML5 drag (which doesn't fire on
  // phones): tap a card to select it, then tap a slot/zone to place it.
  const [selected, setSelected] = useState<DragPayload | null>(null);

  const starterCount = starterSlots.filter(Boolean).length;
  const currentAvg = useMemo(() => {
    const starters = starterSlots.filter((player): player is CupWorkbenchPlayer => Boolean(player));
    if (starters.length === 0) return 0;
    return Math.round(starters.reduce((sum, player) => sum + player.ovr, 0) / starters.length);
  }, [starterSlots]);
  const currentFatigue = useMemo(() => {
    const starters = starterSlots.filter((player): player is CupWorkbenchPlayer => Boolean(player));
    if (starters.length === 0) return 0;
    return Math.round(starters.reduce((sum, player) => sum + player.fatigue, 0) / starters.length);
  }, [starterSlots]);

  function readDrag(event: DragEvent): DragPayload | null {
    const raw = event.dataTransfer.getData('application/x-pm-player');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  }

  function writeDrag(event: DragEvent, payload: DragPayload) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-pm-player', JSON.stringify(payload));
  }

  function removePlayer(payload: DragPayload) {
    const moved =
      payload.source === 'starter'
        ? starterSlots[payload.slotIndex] ?? null
        : payload.source === 'bench'
          ? bench.find((player) => player.id === payload.playerId) ?? null
          : reserves.find((player) => player.id === payload.playerId) ?? null;

    if (!moved) return null;

    setStarterSlots((current) => {
      const next = [...current];
      if (payload.source === 'starter') {
        next[payload.slotIndex] = null;
      }
      return next;
    });
    setBench((current) => {
      if (payload.source !== 'bench') return current;
      return current.filter((player) => player.id !== payload.playerId);
    });
    setReserves((current) => {
      if (payload.source !== 'reserve') return current;
      return current.filter((player) => player.id !== payload.playerId);
    });

    return moved;
  }

  function moveToStarter(payload: DragPayload, targetIndex: number) {
    if (!canEdit) return;

    if (payload.source === 'starter') {
      setStarterSlots((current) => {
        const next = [...current];
        const from = payload.slotIndex;
        const target = next[targetIndex] ?? null;
        next[targetIndex] = next[from] ?? null;
        next[from] = target;
        return next;
      });
      return;
    }

    const replaced = starterSlots[targetIndex] ?? null;
    const moved = removePlayer(payload);
    if (!moved) return;

    setStarterSlots((current) => {
      const next = [...current];
      next[targetIndex] = moved;
      return next;
    });

    if (replaced) {
      if (payload.source === 'bench') setBench((items) => [...items, replaced]);
      else setReserves((items) => [...items, replaced]);
    }
  }

  function moveToList(payload: DragPayload, target: 'bench' | 'reserve') {
    if (!canEdit) return;
    const moved = removePlayer(payload);
    if (!moved) return;
    if (target === 'bench') setBench((items) => [...items, moved]);
    else setReserves((items) => [...items, moved]);
  }

  // ── Tap-to-move (touch) ──
  function tapCard(payload: DragPayload) {
    if (!canEdit) return;
    if (selected && selected.playerId === payload.playerId) {
      setSelected(null); // tapping the selected card again deselects
      return;
    }
    if (selected) {
      // A card is armed → the tapped card's location is the destination.
      if (payload.source === 'starter') moveToStarter(selected, payload.slotIndex);
      else moveToList(selected, payload.source);
      setSelected(null);
      return;
    }
    setSelected(payload);
  }

  function tapSlot(index: number) {
    if (!canEdit || !selected) return;
    moveToStarter(selected, index);
    setSelected(null);
  }

  function tapZone(target: 'bench' | 'reserve') {
    if (!canEdit || !selected) return;
    moveToList(selected, target);
    setSelected(null);
  }

  function saveLineup() {
    const lineupIds = [
      ...starterSlots.filter((player): player is CupWorkbenchPlayer => Boolean(player)).map((player) => player.id),
      ...bench.map((player) => player.id),
      ...reserves.map((player) => player.id),
    ];

    setMessage(null);
    startTransition(async () => {
      const result = await savePlayManagerLineup(lineupIds);
      setMessage(result.success ? 'შემადგენლობა შენახულია' : 'შემადგენლობა ვერ შეინახა');
    });
  }

  function saveTactics() {
    setMessage(null);
    startTransition(async () => {
      const result = await savePlayManagerMatchSettings(settings);
      setMessage(result.success ? 'ტაქტიკა შენახულია' : 'ტაქტიკა ვერ შეინახა');
    });
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[28px] border border-emerald-300/16 bg-black/50 p-4 shadow-[inset_0_0_45px_rgba(16,185,129,0.08)]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/62">
                Lineup workbench
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">{own.name}</h2>
              <p className="mt-1 text-xs font-bold text-white/45">
                {selected
                  ? 'აირჩიე სად განათავსო — დააჭირე სლოტს ან ზონას.'
                  : 'დააჭირე ბარათს ასარჩევად, მერე — სლოტს/ზონას (ან გადაათრიე).'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-right">
              <MiniMetric label="XI" value={`${starterCount}/11`} />
              <MiniMetric label="OVR" value={String(currentAvg)} />
              <MiniMetric label="დაღლა" value={`${currentFatigue}%`} />
            </div>
          </div>

          <div className="relative min-h-[720px] overflow-hidden rounded-[28px] border border-emerald-300/18 bg-[radial-gradient(circle_at_50%_12%,rgba(52,211,153,0.24),transparent_31%),linear-gradient(180deg,#062716,#082012_50%,#030b07)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <PitchLines />
            {PITCH_SLOTS.map((slot, index) => {
              const player = starterSlots[index];
              return (
                <div
                  key={`${slot.label}-${index}`}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
                  onClick={() => { if (!player) tapSlot(index); }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const payload = readDrag(event);
                    if (payload) moveToStarter(payload, index);
                  }}
                >
                  {player ? (
                    <DraggableFutCard
                      player={player}
                      source={{ source: 'starter', playerId: player.id, slotIndex: index }}
                      canDrag={canEdit}
                      selected={selected?.playerId === player.id}
                      onDragStart={writeDrag}
                      onTap={tapCard}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => tapSlot(index)}
                      className={`grid h-[132px] w-[96px] place-items-center rounded-2xl border border-dashed text-center text-[10px] font-black uppercase tracking-[0.12em] transition ${
                        selected
                          ? 'border-emerald-300/70 bg-emerald-300/12 text-emerald-100'
                          : 'border-white/20 bg-black/48 text-white/35'
                      }`}
                    >
                      {slot.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <PlayerDropList
              title="სათადარიგო"
              players={bench}
              target="bench"
              canEdit={canEdit}
              selectedId={selected?.playerId ?? null}
              armed={Boolean(selected)}
              onDropPlayer={moveToList}
              onDragStart={writeDrag}
              onTap={tapCard}
              onZoneTap={tapZone}
            />
            <PlayerDropList
              title="რეზერვი"
              players={reserves}
              target="reserve"
              canEdit={canEdit}
              selectedId={selected?.playerId ?? null}
              armed={Boolean(selected)}
              onDropPlayer={moveToList}
              onDragStart={writeDrag}
              onTap={tapCard}
              onZoneTap={tapZone}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-emerald-300/16 bg-black/58 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/60">Tactics</p>
            <h2 className="mt-1 text-xl font-black text-white">მატჩის გეგმა</h2>
            <div className="mt-4 space-y-3">
              <TacticSelect
                label="სტილი"
                value={settings.tacticalStyle}
                options={TACTICAL_STYLE_OPTIONS}
                onChange={(value) => setSettings((current) => ({ ...current, tacticalStyle: value }))}
                disabled={!canEdit}
              />
              <TacticSelect
                label="დაცვის ხაზი"
                value={settings.defensiveLine}
                options={DEFENSIVE_LINE_OPTIONS}
                onChange={(value) => setSettings((current) => ({ ...current, defensiveLine: value }))}
                disabled={!canEdit}
              />
              <TacticSelect
                label="ტემპი"
                value={settings.tempo}
                options={TEMPO_OPTIONS}
                onChange={(value) => setSettings((current) => ({ ...current, tempo: value }))}
                disabled={!canEdit}
              />
              <TacticSelect
                label="ფოკუსი"
                value={settings.focusSide}
                options={FOCUS_SIDE_OPTIONS}
                onChange={(value) => setSettings((current) => ({ ...current, focusSide: value }))}
                disabled={!canEdit}
              />
            </div>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={saveLineup}
                disabled={!canEdit || pending || starterCount !== 11}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200/24 bg-emerald-300 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35"
              >
                <Save className="h-4 w-4" />
                შემადგენლობის შენახვა
              </button>
              <button
                type="button"
                onClick={saveTactics}
                disabled={!canEdit || pending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-300/10 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Shield className="h-4 w-4" />
                ტაქტიკის შენახვა
              </button>
            </div>
            {message ? (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white/65">
                {message}
              </p>
            ) : null}
          </div>

          <OpponentSnapshot opponent={opponent} />
        </aside>
      </div>

      <ScoutingReport opponent={opponent} ownAvg={currentAvg} tips={tips} />
    </section>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-5 rounded-[24px] border border-white/10" />
      <div className="absolute inset-x-5 top-1/2 h-px bg-white/10" />
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      <div className="absolute inset-x-[28%] top-5 h-[18%] rounded-b-3xl border border-white/10 border-t-0" />
      <div className="absolute inset-x-[28%] bottom-5 h-[18%] rounded-t-3xl border border-white/10 border-b-0" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.018)_0,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_52px)]" />
    </div>
  );
}

function DraggableFutCard({
  player,
  source,
  canDrag,
  selected = false,
  onDragStart,
  onTap,
}: {
  player: CupWorkbenchPlayer;
  source: DragPayload;
  canDrag: boolean;
  selected?: boolean;
  onDragStart: (event: DragEvent, payload: DragPayload) => void;
  onTap?: (payload: DragPayload) => void;
}) {
  return (
    <div
      draggable={canDrag}
      onDragStart={(event) => onDragStart(event, source)}
      onClick={(event) => {
        event.stopPropagation();
        onTap?.(source);
      }}
      className={`relative h-[132px] w-[96px] rounded-2xl ${canDrag ? 'cursor-pointer active:cursor-grabbing sm:cursor-grab' : 'cursor-default'} ${
        selected ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-black' : ''
      }`}
      title={player.name}
    >
      <Link
        href={`/playmanager/players/${player.id}`}
        draggable={false}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        className="absolute right-1 top-1 z-20 grid h-6 w-6 place-items-center rounded-full border border-emerald-200/36 bg-black/76 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition hover:border-emerald-100/70 hover:bg-emerald-300/18"
        aria-label={`${player.name} პროფილის გახსნა`}
        title="პროფილი"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
      <div style={{ transform: 'scale(0.38)', transformOrigin: 'top left' }}>
        <PlayerFutCard
          name={player.name}
          position={player.position}
          ovr={player.ovr}
          availability={player.availability}
          talent={player.talent}
          editorConfig={DEFAULT_FUT_CARD_EDITOR_CONFIG}
        />
      </div>
    </div>
  );
}

function PlayerDropList({
  title,
  players,
  target,
  canEdit,
  selectedId,
  armed,
  onDropPlayer,
  onDragStart,
  onTap,
  onZoneTap,
}: {
  title: string;
  players: CupWorkbenchPlayer[];
  target: 'bench' | 'reserve';
  canEdit: boolean;
  selectedId: string | null;
  armed: boolean;
  onDropPlayer: (payload: DragPayload, target: 'bench' | 'reserve') => void;
  onDragStart: (event: DragEvent, payload: DragPayload) => void;
  onTap: (payload: DragPayload) => void;
  onZoneTap: (target: 'bench' | 'reserve') => void;
}) {
  return (
    <div
      onClick={() => onZoneTap(target)}
      className={`min-h-[190px] rounded-[22px] border bg-black/46 p-3 transition ${
        armed ? 'border-emerald-300/45 bg-emerald-300/[0.04]' : 'border-white/10'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData('application/x-pm-player');
        if (!raw) return;
        onDropPlayer(JSON.parse(raw) as DragPayload, target);
      }}
    >
      <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white/38">{title}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {players.map((player) => (
          <DraggableFutCard
            key={player.id}
            player={player}
            source={{ source: target, playerId: player.id }}
            canDrag={canEdit}
            selected={selectedId === player.id}
            onDragStart={onDragStart}
            onTap={onTap}
          />
        ))}
      </div>
      {players.length === 0 ? (
        <div className="grid min-h-[120px] place-items-center rounded-2xl border border-dashed border-white/10 text-xs font-black text-white/28">
          {armed ? 'აქ დასადებად დააჭირე' : 'ცარიელია'}
        </div>
      ) : null}
    </div>
  );
}

function TacticSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/38">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-2xl border border-emerald-300/14 bg-emerald-300/8 px-3 py-3 text-sm font-black text-white outline-none transition focus:border-emerald-300/38 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-[#020806] text-white">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function OpponentSnapshot({ opponent }: { opponent: CupWorkbenchTeam }) {
  return (
    <div className="rounded-[24px] border border-red-300/16 bg-black/58 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200/62">Opponent</p>
      <h2 className="mt-1 text-xl font-black text-white">{opponent.name}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniMetric label="OVR" value={String(opponent.avgOvr)} />
        <MiniMetric label="მორალი" value={`${opponent.avgMorale}%`} />
        <MiniMetric label="დაღლა" value={`${opponent.avgFatigue}%`} />
        <MiniMetric label="ტრავმა" value={String(opponent.injuredCount)} />
      </div>
    </div>
  );
}

function ScoutingReport({
  opponent,
  ownAvg,
  tips,
}: {
  opponent: CupWorkbenchTeam;
  ownAvg: number;
  tips: string[];
}) {
  return (
    <div className="rounded-[28px] border border-emerald-300/14 bg-black/54 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/62">Scouting report</p>
          <h2 className="mt-1 text-2xl font-black text-white">{opponent.name}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-white/50">
          შენ {ownAvg} OVR · მეტოქე {opponent.avgOvr} OVR
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ScoutRow icon={<UsersRound className="h-4 w-4" />} label="ძალა" value={`${opponent.avgOvr} OVR`} />
        <ScoutRow icon={<Gauge className="h-4 w-4" />} label="დაღლა" value={`${opponent.avgFatigue}%`} />
        <ScoutRow icon={<Activity className="h-4 w-4" />} label="მორალი" value={`${opponent.avgMorale}%`} />
        <ScoutRow icon={<Zap className="h-4 w-4" />} label="სტილი" value={opponent.settings.tacticalStyle} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {tips.map((tip) => (
          <p key={tip} className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.06] px-4 py-3 text-sm font-bold leading-relaxed text-white/68">
            <AlertTriangle className="mr-2 inline h-4 w-4 text-emerald-200" />
            {tip}
          </p>
        ))}
      </div>
    </div>
  );
}

function ScoutRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/35">
        {icon}
        {label}
      </p>
      <strong className="mt-2 block text-lg text-white">{value}</strong>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">{label}</p>
      <strong className="text-sm font-black text-white">{value}</strong>
    </div>
  );
}
