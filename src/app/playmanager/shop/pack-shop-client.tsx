'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { PackageOpen, Sparkles, X } from 'lucide-react';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
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
      <div className="grid gap-4 md:grid-cols-2">
        {packs.map((pack) => {
          const affordable = balance >= pack.cost_pm;
          const busy = busyId === pack.id;
          return (
            <SpotlightCard
              key={pack.id}
              fillHeight={false}
              className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-300/24 bg-amber-300/12 text-amber-100">
                  <PackageOpen className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-black text-white/58">
                  {pack.player_count} ბარათი
                </span>
              </div>
              <h3 className="mt-4 text-xl font-black text-white">{pack.name}</h3>
              {pack.description ? (
                <p className="mt-1 text-sm font-bold leading-6 text-white/52">{pack.description}</p>
              ) : null}
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/60">
                {topTalents(pack.rarity_weights)}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-2xl font-black tabular-nums text-amber-100">
                  {pack.cost_pm.toLocaleString('ka-GE')} <span className="text-base text-white/40">₾</span>
                </span>
                <button
                  type="button"
                  onClick={() => open(pack)}
                  disabled={!affordable || pending}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/16 px-4 text-sm font-black text-amber-50 transition hover:bg-amber-300/24 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {busy ? '...' : affordable ? 'გახსნა' : 'არ ჰყოფნის'}
                </button>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {reveal ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setReveal(null)}
        >
          <SpotlightCard
            fillHeight={false}
            className="w-full max-w-2xl rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,24,18,0.98),rgba(4,8,6,0.99))] p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/70">pack opened</p>
                <h2 className="mt-1 text-2xl font-black text-white">{reveal.packName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setReveal(null)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.1]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {reveal.cards.length === 0 ? (
              <p className="mt-6 text-center text-sm font-bold text-white/50">
                პულში თავისუფალი ბარათი ვერ მოიძებნა.
              </p>
            ) : (
              <div
                className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
                onClick={(e) => e.stopPropagation()}
              >
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
          </SpotlightCard>
        </div>
      ) : null}
    </>
  );
}
