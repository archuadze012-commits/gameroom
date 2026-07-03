'use client';

// Per-coach player development list. Shows the squad players that this coach
// trains (goalkeepers for the GK coach, defenders for the defence coach, …) with
// the same per-player card the old monolithic TrainingLabView used, but self-
// contained: it calls trainPlayManagerPlayer directly (useTransition + refresh),
// like staff-detail-actions.tsx / academy-client.tsx, since the staff detail
// route has no parent onRunPlayerAction handler.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PmCard, PmPill, PmAction, PmGauge } from '@/components/playmanager/pm-cards';
import { getPlayerPotentialForTraining } from '@/components/playmanager/playmanager-city-editor';
import { trainPlayManagerPlayer } from '@/app/playmanager/actions';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';

// Real cost of one training session (mirrors pm_train_player): fatigue + a
// daily session slot. Training now banks a session's worth of dev XP into the
// same budget/cost curve match development uses, so a session may or may not
// buy a stat point outright — the fatigue/session cost is paid either way.
const TRAIN_FATIGUE_COST = 8;

type CoachPlayer = PlayManagerCitySnapshot['squad'][number];

export function CoachTrainingList({
  players,
  pendingOvrByPlayerId,
  pendingXpByPlayerId,
  coachHired,
  coachLevel,
  trainingBonusPct,
  sessionsLeft,
  sessionCapacity,
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
  sessionsLeft: number;
  sessionCapacity: number;
  emptyHint: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function train(playerId: string) {
    setMessage(null);
    setPendingId(playerId);
    startTransition(async () => {
      const result = await trainPlayManagerPlayer(playerId);
      setPendingId(null);
      setMessage(result.message ?? (result.success ? 'შესრულდა' : 'ვერ შესრულდა'));
      if (result.success) router.refresh();
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
      <PmCard>
        <p className="py-4 text-center text-sm font-bold text-white/45">{emptyHint}</p>
      </PmCard>
    );
  }

  const quotaExhausted = sessionsLeft <= 0;

  return (
    <div className="space-y-3">
      {message ? (
        <div className="rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
          {message}
        </div>
      ) : null}

      <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 ${
        quotaExhausted ? 'border-red-300/22 bg-red-300/[0.07]' : 'border-white/10 bg-black/24'
      }`}>
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/50">დღევანდელი სესიები</span>
        <span className={`text-sm font-black ${quotaExhausted ? 'text-red-300' : 'text-emerald-300'}`}>
          {sessionsLeft}/{sessionCapacity}
        </span>
      </div>
      {quotaExhausted ? (
        <div className="rounded-2xl border border-red-300/18 bg-red-300/[0.06] px-4 py-2.5 text-[11px] font-bold leading-5 text-red-100/80">
          დღევანდელი სავარჯიშო სესიები ამოიწურა — გაათამაშე მატჩი ან გადადი შემდეგ დღეს. ლიმიტს ზრდის მენეჯერის
          ასისტენტი და სავარჯიშო ბაზის დონე.
        </div>
      ) : null}

      {!coachHired ? (
        <div className="rounded-2xl border border-white/10 bg-black/24 px-4 py-2.5 text-[11px] font-bold leading-5 text-white/55">
          ეს მწვრთნელი ჯერ არ არის დაქირავებული — ვარჯიში მუშაობს, მაგრამ დაქირავებისას მიიღებ ვარჯიშის ბონუსს.
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.06] px-4 py-2.5 text-[11px] font-bold leading-5 text-emerald-100/75">
          მწვრთნელი LVL {coachLevel} · ვარჯიშის ბონუსი აქტიურია ამ ჯგუფზე.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map(({ player, potential, remainingGrowth, progressPct, hasPendingUpgrade, pendingOvr, bankedXp }) => {
          const trainPending = pendingId === player.id;
          const blocked = player.availability === 'injured' || remainingGrowth <= 0 || quotaExhausted;
          return (
            <PmCard key={player.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">{player.cardDisplayName?.trim() || player.name}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                    {player.position} · {player.age} წლის · Talent {player.talent}
                  </p>
                </div>
                <PmPill tone="green">{player.ovrCurrent}</PmPill>
              </div>
              <div className="flex flex-wrap gap-2">
                <PmPill>Potential {potential}</PmPill>
                <PmPill tone="green">+{remainingGrowth}</PmPill>
                <PmPill tone="red">−{TRAIN_FATIGUE_COST} ფიზ. · 1 სესია</PmPill>
                {hasPendingUpgrade ? (
                  <PmPill tone="green">pending OVR {pendingOvr} ✦</PmPill>
                ) : bankedXp > 0 ? (
                  <PmPill>{bankedXp} dev XP დაგროვილი</PmPill>
                ) : null}
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
                onClick={() => train(player.id)}
                className="w-full justify-center"
              >
                {trainPending
                  ? 'ვითარდება...'
                  : player.availability === 'injured'
                    ? 'ტრავმირებულია'
                    : remainingGrowth <= 0
                      ? hasPendingUpgrade
                        ? 'ასაწევია ასისტენტთან'
                        : 'პოტენციალი შევსებულია'
                      : quotaExhausted
                        ? 'სესიები ამოიწურა'
                        : 'ვარჯიში · +pending'}
              </PmAction>
            </PmCard>
          );
        })}
      </div>

      <p className="text-[11px] font-bold leading-5 text-white/40">
        ვარჯიში მატჩების მსგავსად აგროვებს development XP-ს <b className="text-white/70">pending მინი-სტატებზე</b> —
        ხშირად რამდენიმე სესია სჭირდება ერთ ქულამდე, არა ერთი დაჭერა. OVR პირდაპირ არ იმატებს; ის აიწევა მენეჯერის
        ასისტენტის გვერდზე, Pro-ბარათების მსხვერპლით. ყოველი სესია ხარჯავს დღიურ ლიმიტს და ფიზიკურ ენერგიას; ჭერი
        ტალანტია. Training bonus +{trainingBonusPct}% ზრდის მწვრთნელის XP-წვლილს სესიაზე.
      </p>
    </div>
  );
}
