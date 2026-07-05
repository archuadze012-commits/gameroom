'use client';

// head_coach (Manager Assistant) page = training-economy hub:
//  1. XP-pack shop (relocated from the old TrainingLabView) — funds development.
//  2. Pending-OVR list — players whose match XP has accumulated into
//     pending_card_stats (via pm_grant_match_development); each links to its
//     player page where OvrUpgradePanel confirms the OVR jump with fodder.
//  3. Readiness / skill-moves overview — the assistant's passive contribution.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, HeartPulse, Sparkles, Wand2 } from 'lucide-react';
import { PmCard, PmCardHead, PmPill, PmAction, PmGauge } from '@/components/playmanager/pm-cards';
import { NestedMiniBox } from '@/components/playmanager/panel-primitives';
import { buyPlayManagerXpPack } from '@/app/playmanager/actions/player-development-actions';

const XP_PACKS = [
  { key: 'starter' as const, label: 'Starter Pack', xp: 300, price: '35 000 ₾' },
  { key: 'prep' as const, label: 'Match Prep', xp: 850, price: '90 000 ₾' },
  { key: 'elite' as const, label: 'Elite Camp', xp: 1800, price: '175 000 ₾' },
];

export type PendingOvrPlayer = { id: string; name: string; ovrCurrent: number };

export function HeadCoachHub({
  managerXp,
  pendingPlayers,
  teamReadiness,
  readinessFlat,
  hired,
  level,
}: {
  managerXp: number;
  pendingPlayers: PendingOvrPlayer[];
  teamReadiness: number;
  readinessFlat: number;
  hired: boolean;
  level: number;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function buy(pack: 'starter' | 'prep' | 'elite') {
    setMessage(null);
    setPendingKey(pack);
    startTransition(async () => {
      const result = await buyPlayManagerXpPack(pack);
      setPendingKey(null);
      setMessage(result.message ?? (result.success ? 'შესრულდა' : 'ვერ შესრულდა'));
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
          {message}
        </div>
      ) : null}

      {/* ── Readiness / skill overview ── */}
      <PmCard>
        <PmCardHead icon={HeartPulse} title="შტაბის readiness" subtitle="Assistant" tone={hired ? 'green' : 'red'} />
        <div className="grid grid-cols-3 gap-2">
          <NestedMiniBox label="გუნდის readiness" value={`${teamReadiness}%`} valueClassName="text-emerald-300" />
          <NestedMiniBox label="ასისტენტის ბონუსი" value={hired ? `+${readinessFlat}` : '—'} valueClassName={hired ? 'text-emerald-300' : 'text-white'} />
          <NestedMiniBox label="დონე" value={hired ? `LVL ${level}` : 'დაუქირავებელი'} />
        </div>
        <p className="text-[11px] font-bold leading-5 text-white/45">
          მენეჯერის ასისტენტი ზრდის გუნდის readiness-ს, ყოველ დონეზე +1 დღიურ სავარჯიშო სესიას მატებს და დროთა
          განმავლობაში აღადგენს მოთამაშეების ოსტატობას (skill moves).
        </p>
      </PmCard>

      {/* ── XP-pack shop ── */}
      <PmCard>
        <PmCardHead
          icon={Sparkles}
          title="დაჩქარებული განვითარება"
          subtitle="XP Shop"
          right={<PmPill tone="green">{managerXp.toLocaleString('en-US')} XP</PmPill>}
        />
        <p className="text-[11px] font-bold leading-5 text-white/52">
          იყიდე XP პაკეტი, რომ მოთამაშეების განვითარება დააჩქარო. მატჩი რჩება XP-ის მთავარ წყაროდ.
        </p>
        <div className="space-y-2">
          {XP_PACKS.map((pack) => {
            const buyPending = pendingKey === pack.key;
            return (
              <div key={pack.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/28 px-3 py-2.5">
                <div>
                  <p className="text-sm font-black text-white">{pack.label}</p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                    +{pack.xp} XP · {pack.price}
                  </p>
                </div>
                <PmAction tone="green" disabled={buyPending} onClick={() => buy(pack.key)}>
                  {buyPending ? 'ვმუშავდები...' : 'ყიდვა'}
                </PmAction>
              </div>
            );
          })}
        </div>
      </PmCard>

      {/* ── Pending-OVR list ── */}
      <PmCard>
        <PmCardHead icon={Wand2} title="OVR აფგრეიდის რიგი" subtitle="Pending upgrades" />
        {pendingPlayers.length === 0 ? (
          <p className="py-3 text-center text-sm font-bold text-white/45">
            ამჟამად დასადასტურებელი აფგრეიდი არ არის — მატჩების შემდეგ მოთამაშეები დააგროვებენ განვითარებას.
          </p>
        ) : (
          <>
            <div className="mb-1">
              <PmGauge percent={100} />
            </div>
            <div className="space-y-2">
              {pendingPlayers.map((player) => (
                <Link
                  key={player.id}
                  href={`/playmanager/players/${player.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/24 p-3.5 transition hover:border-white/16 hover:bg-black/32"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{player.name}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-white/45">OVR {player.ovrCurrent} · დასადასტურებელია</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-300">
                    დადასტურება <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </PmCard>
    </div>
  );
}
