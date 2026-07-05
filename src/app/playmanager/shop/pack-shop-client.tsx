'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { PackageOpen, Sparkles, X } from 'lucide-react';
import { PmCard, PmCardHead } from '@/components/playmanager/pm-cards';
import { TalentClassBadge } from '@/components/playmanager/talent-class-badge';
import { openPlayManagerPack } from '@/app/playmanager/actions/player-development-actions';
import { formatGel } from '@/lib/playmanager/economy';

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

function PackCard({
  pack,
  balance,
  pending,
  busy,
  open,
}: {
  pack: ShopPack;
  balance: number;
  pending: boolean;
  busy: boolean;
  open: () => void;
}) {
  const affordable = balance >= pack.cost_pm;
  const talentsLabel = topTalents(pack.rarity_weights);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-emerald-300/10 bg-[#020805]/90 shadow-[0_16px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-emerald-400/24 hover:shadow-[0_20px_48px_rgba(16,185,129,0.15)]">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.03),transparent_60%)]" />
      
      {/* Shimmer overlay on hover */}
      <div aria-hidden className="absolute inset-0 pointer-events-none bg-[linear-gradient(115deg,transparent_0%,rgba(52,211,153,0.04)_46%,transparent_52%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Hero stage / Graphic area */}
      <div className="relative h-[180px] w-full grid place-items-center overflow-hidden rounded-t-[22.5px] border-b border-white/5 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_70%)]">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
        
        {/* Glow Line at bottom of stage */}
        <div aria-hidden className="absolute inset-x-5 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(52,211,153,0.3),transparent)]" />

        {/* Floating animated icon */}
        <PackageOpen className="relative z-10 h-16 w-16 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-transform duration-500 group-hover:scale-110" />

        {/* Rarity/Weight Badge */}
        <span className="absolute left-3 top-3 z-20 rounded-full border border-emerald-300/20 bg-emerald-950/60 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-300 backdrop-blur-md">
          {talentsLabel}
        </span>

        {/* Cards Count Pill */}
        <span className="absolute right-3 top-3 z-20 rounded-full border border-white/5 bg-white/[0.05] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/60 backdrop-blur-md">
          {pack.player_count} ბარათი
        </span>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-black uppercase leading-tight text-white transition-colors group-hover:text-emerald-300">
            {pack.name}
          </h3>
          {pack.description && (
            <p className="mt-2 text-xs font-bold leading-relaxed text-white/52 line-clamp-2">
              {pack.description}
            </p>
          )}
        </div>

        {/* Footer Area */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-white/30">ღირებულება</p>
            <span className="font-display text-xl font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
              {formatGel(pack.cost_pm)}
            </span>
          </div>

          <button
            type="button"
            onClick={open}
            disabled={!affordable || pending}
            className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[0_0_20px_rgba(52,211,153,0.25)] transition-all hover:scale-105 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/38 disabled:shadow-none"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {busy ? '...' : affordable ? 'გახსნა' : 'არ ჰყოფნის'}
          </button>
        </div>
      </div>
    </article>
  );
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            balance={balance}
            pending={pending}
            busy={busyId === pack.id}
            open={() => open(pack)}
          />
        ))}
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
