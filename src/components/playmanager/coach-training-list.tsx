'use client';

// Per-coach player development list. Shows the squad players that this coach
// trains (goalkeepers for the GK coach, defenders for the defence coach, …) as
// FUT cards — the same visual language as market/lineup — instead of a
// text-heavy stat sheet, so a card is scannable at a glance: photo + OVR +
// stats are already ON the card, leaving room for just growth status + one
// action button. Self-contained: calls trainPlayManagerPlayer directly
// (useTransition + refresh), like staff-detail-actions.tsx / academy-client.tsx,
// since the staff detail route has no parent onRunPlayerAction handler.

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PmPill, PmGauge } from '@/components/playmanager/pm-cards';
import { NestedMiniBox } from '@/components/playmanager/panel-primitives';
import { PlayerFutCard, DEFAULT_FUT_CARD_EDITOR_CONFIG } from '@/components/playmanager/player-fut-card';
import { getPlayerPotentialForTraining } from '@/components/playmanager/playmanager-city-editor';
import { trainPlayManagerPlayer } from '@/app/playmanager/actions';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';

// Feedback shown right on the FUT card after a training session: either the
// exact mini-stat that just rose gets a green glow-pulse (kind 'stats'), or —
// when a session only banked XP without buying a point yet — a "+N XP" toast
// briefly covers the photo, both auto-clearing after ~2.7s.
type FlashState =
  | { playerId: string; kind: 'stats'; stats: string[]; nonce: number }
  | { playerId: string; kind: 'xp'; amount: number; nonce: number }
  | null;

const FLASH_DURATION_MS = 2700;

// Real cost of one training session (mirrors pm_train_player): fatigue, plus
// the hard cadence limit of one session per player per league match. Training
// banks a session's worth of dev XP into the same budget/cost curve match
// development uses, so a session may or may not buy a stat point outright — the
// cost is paid either way.
const TRAIN_FATIGUE_COST = 8;

type CoachPlayer = PlayManagerCitySnapshot['squad'][number];

export function CoachTrainingList({
  players,
  pendingOvrByPlayerId,
  pendingXpByPlayerId,
  coachHired,
  coachLevel,
  trainingBonusPct,
  trainedThisMatchIds,
  emptyHint,
}: {
  players: CoachPlayer[];
  // playerId -> OVR implied by their pending_card_stats (if higher than live).
  // Training banks into pending, not live OVR — headroom must account for it or
  // an already-maxed-via-pending player still shows an enabled train button.
  pendingOvrByPlayerId: Record<string, number>;
  // playerId -> banked dev XP (pm_players.xp) not yet spent on a stat point.
  // Decoded legacy card_stats can imply an OVR slightly BELOW the live one (a
  // pre-existing seed-data quirk), so pendingOvr can start under live OVR even
  // though a session genuinely banked XP — show that progress directly so
  // training doesn't look like a no-op.
  pendingXpByPlayerId: Record<string, number>;
  coachHired: boolean;
  coachLevel: number;
  trainingBonusPct: number;
  // playerIds that have already used their one training session in the current
  // league-match window (server truth). The client also tracks locally-just-
  // trained ids so a card locks instantly, before router.refresh lands.
  trainedThisMatchIds: string[];
  emptyHint: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [justTrainedIds, setJustTrainedIds] = useState<string[]>([]);
  const flashNonceRef = useRef(0);

  const trainedSet = new Set([...trainedThisMatchIds, ...justTrainedIds]);

  function train(playerId: string) {
    setMessage(null);
    setPendingId(playerId);
    startTransition(async () => {
      const result = await trainPlayManagerPlayer(playerId);
      setPendingId(null);
      setMessage(result.message ?? (result.success ? 'შესრულდა' : 'ვერ შესრულდა'));
      if (result.success) {
        setJustTrainedIds((current) => (current.includes(playerId) ? current : [...current, playerId]));
        router.refresh();
        flashNonceRef.current += 1;
        const nonce = flashNonceRef.current;
        if (result.improvedStats && result.improvedStats.length > 0) {
          setFlash({ playerId, kind: 'stats', stats: result.improvedStats, nonce });
        } else if (result.devXpGranted != null && result.devXpGranted > 0) {
          setFlash({ playerId, kind: 'xp', amount: result.devXpGranted, nonce });
        }
        setTimeout(() => {
          setFlash((current) => (current?.nonce === nonce ? null : current));
        }, FLASH_DURATION_MS);
      }
    });
  }

  const rows = players
    .map((player) => {
      const potential = getPlayerPotentialForTraining(player);
      const pendingOvr = pendingOvrByPlayerId[player.id];
      const hasPendingUpgrade = pendingOvr != null && pendingOvr > player.ovrCurrent;
      // Headroom must be judged against whichever is higher — live or pending —
      // since training keeps stacking onto pending, not live, OVR.
      const effectiveOvr = hasPendingUpgrade ? pendingOvr : player.ovrCurrent;
      const remainingGrowth = Math.max(0, potential - effectiveOvr);
      const totalGrowth = Math.max(1, potential - player.ovrBase);
      const progressPct = Math.min(100, Math.round(((effectiveOvr - player.ovrBase) / totalGrowth) * 100));
      const bankedXp = pendingXpByPlayerId[player.id] ?? 0;
      return { player, potential, remainingGrowth, progressPct, hasPendingUpgrade, pendingOvr, bankedXp };
    })
    .sort((left, right) => {
      if (right.remainingGrowth !== left.remainingGrowth) return right.remainingGrowth - left.remainingGrowth;
      return left.player.age - right.player.age || right.player.ovrCurrent - left.player.ovrCurrent;
    });

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/24 py-4 text-center text-sm font-bold text-white/45">
        {emptyHint}
      </div>
    );
  }

  const trainedCount = rows.filter((row) => trainedSet.has(row.player.id)).length;
  const allTrained = rows.length > 0 && trainedCount >= rows.length;

  return (
    <div className="space-y-3">
      {message ? (
        <div className="rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
          {message}
        </div>
      ) : null}

      <div
        className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border px-4 py-2.5 ${
          allTrained ? 'border-white/10 bg-black/24' : 'border-emerald-300/18 bg-emerald-300/[0.05]'
        }`}
      >
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/50">
          1 სესია / მოთამაშე · მატჩი
        </span>
        <span className="text-[10px] font-bold text-white/35">
          −{TRAIN_FATIGUE_COST} ფიზ.{coachHired ? ` · მწვრთნელი LVL ${coachLevel}` : ' · მწვრთნელი დაუქირავებელია'}
        </span>
      </div>
      {allTrained ? (
        <div className="rounded-2xl border border-white/10 bg-black/24 px-4 py-2.5 text-[11px] font-bold leading-5 text-white/55">
          ამ ჯგუფმა ამ მატჩზე უკვე ივარჯიშა — შემდეგი სესიები გაიხსნება მომდევნო matchday-ის შემდეგ.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map(({ player, potential, remainingGrowth, progressPct, hasPendingUpgrade, pendingOvr, bankedXp }) => {
          const trainPending = pendingId === player.id;
          const alreadyTrained = trainedSet.has(player.id);
          const blocked = player.availability === 'injured' || remainingGrowth <= 0 || alreadyTrained;
          const playerFlash = flash?.playerId === player.id ? flash : null;
          const flashStatLabels = playerFlash?.kind === 'stats' ? playerFlash.stats : undefined;
          return (
            <div
              key={player.id}
              className="group overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,18,17,0.96),rgba(4,8,6,0.98))] p-3 shadow-[0_18px_46px_rgba(0,0,0,0.34)] transition hover:border-emerald-300/24"
            >
              <div className="flex justify-center">
                <div className="relative h-[190px] w-[137px] overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]">
                  <div style={{ transform: 'scale(0.546)', transformOrigin: 'top left' }} className="h-[347px] w-[251px]">
                    <PlayerFutCard
                      name={player.name}
                      labelOverride={player.cardDisplayName}
                      imageUrl={player.cardImageUrl}
                      nationalityCode={player.nationalityCode}
                      stats={player.stats}
                      position={player.position}
                      ovr={player.ovrCurrent}
                      availability={player.availability}
                      talent={player.talent}
                      editorConfig={player.cardEditorConfig ?? DEFAULT_FUT_CARD_EDITOR_CONFIG}
                      flashLabels={flashStatLabels}
                      flashNonce={playerFlash?.nonce}
                    />
                  </div>
                  {playerFlash?.kind === 'xp' ? (
                    <div
                      key={playerFlash.nonce}
                      className="pm-xp-toast pointer-events-none absolute inset-x-2 top-[24%] flex h-[46%] flex-col items-center justify-center"
                    >
                      <span className="pm-xp-glow text-lg font-black text-emerald-300">+{playerFlash.amount}</span>
                      <span className="pm-xp-glow text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300/90">dev XP</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <NestedMiniBox label="Potential" value={String(potential)} />
                {hasPendingUpgrade ? (
                  <PmPill tone="green">✦ {pendingOvr}</PmPill>
                ) : bankedXp > 0 ? (
                  <PmPill>{bankedXp} XP</PmPill>
                ) : (
                  <PmPill tone="green">+{remainingGrowth}</PmPill>
                )}
              </div>

              <PmGauge percent={progressPct} className="mt-2" />

              <button
                type="button"
                disabled={trainPending || blocked}
                onClick={() => train(player.id)}
                className="mt-3 w-full rounded-xl border border-emerald-200/25 bg-[linear-gradient(180deg,#6ee7b7,#34d399)] px-3 py-2.5 text-xs font-black text-emerald-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-none disabled:bg-white/[0.04] disabled:text-white/40"
              >
                {trainPending
                  ? 'ვითარდება...'
                  : player.availability === 'injured'
                    ? 'ტრავმირებულია'
                    : remainingGrowth <= 0
                      ? hasPendingUpgrade
                        ? 'ასაწევია ასისტენტთან'
                        : 'პოტენციალი შევსებულია'
                      : alreadyTrained
                        ? 'ამ მატჩზე ივარჯიშა'
                        : 'ვარჯიში'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-bold leading-5 text-white/40">
        თითო მოთამაშე მატჩიდან მატჩამდე <b className="text-white/70">ერთხელ</b> ვარჯიშობს — ვარჯიში მატჩების მსგავსად
        აგროვებს development XP-ს <b className="text-white/70">pending მინი-სტატებზე</b>, ხშირად რამდენიმე matchday სჭირდება
        ერთ ქულამდე. OVR პირდაპირ არ იმატებს; ის აიწევა მენეჯერის ასისტენტის გვერდზე, Pro-ბარათების მსხვერპლით.
        Training bonus +{trainingBonusPct}% ზრდის მწვრთნელის XP-წვლილს სესიაზე.
      </p>
    </div>
  );
}
