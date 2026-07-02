'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { PackageOpen, Sparkles, X } from 'lucide-react';
import { PmCard, PmCardHead, PmPill, PmAction } from '@/components/playmanager/pm-cards';
import { TalentClassBadge } from '@/components/playmanager/talent-class-badge';
import { openPlayManagerPack } from '@/app/playmanager/actions';

export type ShopPack = {
  id: number;
  name: string;
  description: string | null;
  cost_pm: number;
  player_count: number;
  rarity_weights: Record<string, number> | null;
};

export type RevealedCard = {
  id: string;
  display_name: string;
  ovr_current: number;
  talent: number;
  primary_position: string | null;
  nationality_code: string | null;
  card_image_url: string | null;
};

function topTalents(weights: Record<string, number> | null): string {
  if (!weights) return '—';
  const keys = Object.keys(weights)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (keys.length === 0) return '—';
  return `ტალანტი ${keys[0]}–${keys[keys.length - 1]}`;
}

export function PackShopClient({ packs, balance }: { packs: ShopPack[]; balance: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{ packName: string; cards: RevealedCard[] } | null>(null);

  function open(pack: ShopPack) {
    if (pending) return;
    setBusyId(pack.id);
    startTransition(async () => {
      const result = await openPlayManagerPack(pack.id);
      setBusyId(null);
      if (result.success) {
        const cards = (result.players ?? []) as RevealedCard[];
        setReveal({ packName: pack.name, cards });
        toast.success(result.message ?? 'პაკი გაიხსნა');
        router.refresh();
      } else {
        toast.error(
          result.error === 'insufficient_funds' ? 'საკმარისი თანხა არ არის' : 'ვერ მოხერხდა',
        );
      }
    });
  }

  return (
    <>
      <div className="pm-feedskin grid gap-4 md:grid-cols-2">
        {packs.map((pack) => {
          const affordable = balance >= pack.cost_pm;
          const busy = busyId === pack.id;
          return (
            <PmCard key={pack.id}>
              <PmCardHead
                icon={PackageOpen}
                title={pack.name}
                subtitle={topTalents(pack.rarity_weights)}
                right={<PmPill>{pack.player_count} ბარათი</PmPill>}
              />
              {pack.description ? (
                <p className="text-sm font-bold leading-6 text-white/52">{pack.description}</p>
              ) : null}

              <div className="mt-auto flex items-center justify-between gap-3">
                <PmPill tone="red">
                  {pack.cost_pm.toLocaleString('ka-GE')} ₾
                </PmPill>
                <PmAction
                  tone="green"
                  onClick={() => open(pack)}
                  disabled={!affordable || pending}
                >
                  <Sparkles className="h-4 w-4" />
                  {busy ? '...' : affordable ? 'გახსნა' : 'არ ჰყოფნის'}
                </PmAction>
              </div>
            </PmCard>
          );
        })}
      </div>

      {reveal ? (
        <div
          className="pm-feedskin fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setReveal(null)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <PmCard>
              <PmCardHead
                icon={Sparkles}
                title={reveal.packName}
                subtitle="pack opened"
                right={
                  <button
                    type="button"
                    onClick={() => setReveal(null)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.1]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                }
              />

              {reveal.cards.length === 0 ? (
                <p className="text-center text-sm font-bold text-white/50">
                  პულში თავისუფალი ბარათი ვერ მოიძებნა.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {reveal.cards.map((card) => (
                    <Link
                      key={card.id}
                      href={`/playmanager/players/${card.id}`}
                      className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3 text-center transition hover:bg-white/[0.07]"
                    >
                      <p className="text-3xl font-black tabular-nums text-emerald-100">{card.ovr_current}</p>
                      <p className="mt-1 truncate text-sm font-black text-white">{card.display_name}</p>
                      <p className="text-[11px] font-bold text-white/42">
                        {(card.primary_position?.toUpperCase() || 'CM')}
                      </p>
                      <div className="mt-2 flex justify-center">
                        <TalentClassBadge talent={card.talent} showValue />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </PmCard>
          </div>
        </div>
      ) : null}
    </>
  );
}
