'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Handshake,
  Inbox,
  MessageSquare,
  Radar,
  Search,
  ShoppingCart,
  Store,
  X,
} from 'lucide-react';
import { PlayerFutCard, DEFAULT_FUT_CARD_EDITOR_CONFIG } from '@/components/playmanager/player-fut-card';
import {
  buyPlayManagerMarketPlayer,
  buyPlayManagerListedPlayer,
  makePlayManagerTransferOffer,
  respondPlayManagerTransferOffer,
  cancelPlayManagerTransferOffer,
} from '@/app/playmanager/actions';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
import CountUp from '@/components/CountUp';
import type { PlayerCardStatsInput } from '@/lib/playmanager/player-card-stats';
import type { PlayManagerPlayerCardLayout } from '@/lib/playmanager/player-card';
import { TalentClassBadge } from '@/components/playmanager/talent-class-badge';
import { NestedMiniBox } from '@/components/playmanager/panel-primitives';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';

type MarketFilterKey = 'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT' | 'SHORTLIST';

type MarketPlayer = {
  key: string;
  id: string | null;
  name: string;
  cardDisplayName?: string | null;
  cardImageUrl?: string | null;
  nationalityCode?: string | null;
  cardEditorConfig?: PlayManagerPlayerCardLayout;
  stats?: PlayerCardStatsInput;
  position: string;
  age: number;
  ovr: number;
  talent: number;
  value: number;
  valueLabel: string;
  demand: string;
  available: boolean;
  shortlisted: boolean;
  // Present only for manager↔manager listings (transfer_market module).
  listingId?: string;
  sellerUserId?: string | null;
  sellerTeamName?: string | null;
  floorPrice?: number;
};

type TransferOfferItem = {
  id: string;
  listingId: string | null;
  direction: 'incoming' | 'outgoing';
  awaitingMe: boolean;
  iAmBuyer: boolean;
  amount: number;
  floorPrice: number;
  counterpartName: string;
  playerName: string;
  position: string;
  ovr: number;
  updatedAt: string;
};

type FreeAgentsMeta = {
  scoutHired: boolean;
  scoutLevel: number;
  maxScoutLevel: number;
  tier: number;
  refreshesEveryHours: number;
  nextRefreshAt: string | null;
  refreshLabel: string;
};

const FILTERS: Array<[MarketFilterKey, string]> = [
  ['ALL', 'ყველა'],
  ['GK', 'მეკარე'],
  ['DEF', 'დაცვა'],
  ['MID', 'შუა ხაზი'],
  ['ATT', 'შეტევა'],
  ['SHORTLIST', 'შენახული'],
];

const PAGE_SIZE = 10;

export function MarketStudio({
  team,
  manager,
}: {
  team: { name: string; balanceLabel: string; divisionLabel: string };
  manager: { name: string; avatarUrl: string | null };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const moduleKey = searchParams.get('module') ?? 'transfer_market';
  const isFreeAgents = moduleKey === 'free_agents';

  const filterParam = (searchParams.get('filter') ?? 'ALL').toUpperCase();
  const filter: MarketFilterKey = FILTERS.some(([key]) => key === filterParam) ? (filterParam as MarketFilterKey) : 'ALL';
  const query = searchParams.get('q')?.trim() ?? '';
  const pageRaw = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const [items, setItems] = useState<MarketPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [freeAgents, setFreeAgents] = useState<FreeAgentsMeta | null>(null);
  const [searchDraft, setSearchDraft] = useState(query);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [offerTarget, setOfferTarget] = useState<MarketPlayer | null>(null);
  const [contactingKey, setContactingKey] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [offers, setOffers] = useState<TransferOfferItem[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [awaitingMe, setAwaitingMe] = useState(0);

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const response = await fetch('/api/playmanager/offers', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setOffers(data.items ?? []);
      setAwaitingMe(data.awaitingMe ?? 0);
    } finally {
      setOffersLoading(false);
    }
  }, []);

  // Poll the awaiting-me badge in the transfer market so incoming offers surface
  // without a manual refresh.
  useEffect(() => {
    if (isFreeAgents) return;
    loadOffers();
    const id = window.setInterval(loadOffers, 20_000);
    return () => window.clearInterval(id);
  }, [isFreeAgents, loadOffers]);

  // Notification deep-link target: ?offers=1 opens the inbox drawer directly
  // (e.g. from an offer-received event in the notifications feed).
  useEffect(() => {
    if (searchParams.get('offers') === '1') setInboxOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function contactSeller(player: MarketPlayer) {
    if (!player.sellerUserId) {
      setToast({ ok: false, message: 'გამყიდველთან დაკავშირება ვერ მოხერხდა' });
      return;
    }
    setContactingKey(player.key);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: player.sellerUserId }),
      });
      const data = await response.json();
      if (!response.ok || !data?.id) {
        setToast({ ok: false, message: 'ჩატის გახსნა ვერ მოხერხდა' });
        return;
      }
      router.push(`/playmanager/media?module=direct_messages&c=${data.id}`);
    } finally {
      setContactingKey(null);
    }
  }

  function submitOffer(player: MarketPlayer, amount: number) {
    if (!player.listingId) return;
    setToast(null);
    startTransition(async () => {
      const result = await makePlayManagerTransferOffer(player.listingId!, amount);
      if (!result.success) {
        setToast({ ok: false, message: result.message ?? 'შეთავაზება ვერ გაიგზავნა' });
        return;
      }
      setOfferTarget(null);
      setToast({ ok: true, message: result.message ?? 'შეთავაზება გაიგზავნა' });
      loadOffers();
    });
  }

  function respondOffer(offer: TransferOfferItem, action: 'accept' | 'reject' | 'counter', counterAmount?: number) {
    setToast(null);
    startTransition(async () => {
      const result = await respondPlayManagerTransferOffer(offer.id, action, counterAmount);
      if (!result.success) {
        setToast({ ok: false, message: result.message ?? 'მოქმედება ვერ შესრულდა' });
        return;
      }
      setToast({ ok: true, message: result.message ?? 'შესრულდა' });
      loadOffers();
      if (action === 'accept') router.refresh();
    });
  }

  function withdrawOffer(offer: TransferOfferItem) {
    setToast(null);
    startTransition(async () => {
      const result = await cancelPlayManagerTransferOffer(offer.id);
      if (!result.success) {
        setToast({ ok: false, message: result.message ?? 'გაუქმება ვერ მოხერხდა' });
        return;
      }
      setToast({ ok: true, message: result.message ?? 'გაუქმდა' });
      loadOffers();
    });
  }

  const setQuery = useCallback(
    (updates: { filter?: MarketFilterKey; q?: string; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('module', moduleKey);
      if (updates.filter !== undefined) params.set('filter', updates.filter);
      if (updates.q !== undefined) {
        const trimmed = updates.q.trim();
        if (trimmed) params.set('q', trimmed);
        else params.delete('q');
      }
      params.set('page', String(updates.page ?? 1));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, moduleKey],
  );

  // Debounced search → URL.
  useEffect(() => {
    if (isFreeAgents) return;
    if (searchDraft.trim() === query) return;
    const id = window.setTimeout(() => setQuery({ q: searchDraft, page: 1 }), 350);
    return () => window.clearTimeout(id);
  }, [searchDraft, query, isFreeAgents, setQuery]);

  // Fetch the current page (10 players) — the heavy lifting is paginated server-side.
  // NOTE: `setQuery` is intentionally excluded from the deps below. It's a
  // useCallback closing over `searchParams`, which Next.js does not guarantee
  // to be referentially stable across renders — including it here caused this
  // effect to restart on every render, so the fetch was always cancelled by
  // the next run before it could resolve, leaving `loading` stuck at `true`
  // forever (a permanent skeleton). The effect's real reactive inputs are the
  // primitive values below; `setQuery` is only invoked conditionally inside
  // (pagination correction) and doesn't need to retrigger the fetch itself.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          module: moduleKey,
          filter,
          page: String(page),
          pageSize: isFreeAgents ? '5' : String(PAGE_SIZE),
        });
        if (!isFreeAgents && query) params.set('q', query);
        const response = await fetch(`/api/playmanager/market?${params.toString()}`, { cache: 'no-store' });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        if (cancelled) return;
        if (!isFreeAgents && typeof data.pagination?.page === 'number' && data.pagination.page !== page) {
          setQuery({ page: data.pagination.page });
          return;
        }
        setItems(data.items ?? []);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setFreeAgents(data.meta?.freeAgents ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, filter, page, query, isFreeAgents]);

  function buy(player: MarketPlayer) {
    setBuyingKey(player.key);
    setToast(null);
    startTransition(async () => {
      // Manager↔manager listings settle through pm_buy_listed_player (Buy Now);
      // the global real-player pool uses the seed-buy path.
      const result = player.listingId
        ? await buyPlayManagerListedPlayer(player.listingId)
        : await buyPlayManagerMarketPlayer(player.key);
      setBuyingKey(null);
      if (!result.success) {
        setToast({ ok: false, message: result.message ?? 'ყიდვა ვერ მოხერხდა' });
        return;
      }
      const spent = result.amount ? Math.abs(result.amount) : 0;
      setToast({ ok: true, message: spent ? `${player.name} შეძენილია · -${spent.toLocaleString('ka-GE')} ₾` : `${player.name} შეძენილია` });
      setItems((current) => current.filter((entry) => entry.key !== player.key));
      loadOffers();
      router.refresh();
    });
  }

  return (
    <main className="pm-hq-home pm-feedskin pm-hq-shell relative min-h-screen overflow-x-hidden bg-[#04100a] pb-24 text-white xl:pb-16 xl:pl-[92px]">
      <PlayManagerSidebar />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(115%_80%_at_50%_-10%,rgba(16,185,129,0.16),transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-[1320px] px-3 py-4 sm:px-5 lg:px-7">
        <CommandBar
          team={team}
          manager={manager}
          isFreeAgents={isFreeAgents}
          awaitingMe={awaitingMe}
          offersCount={offers.length}
          onOpenInbox={() => { setInboxOpen(true); loadOffers(); }}
        />

        {isFreeAgents ? (
          <FreeAgentsBanner meta={freeAgents} />
        ) : (
          <LayoutGroup>
            <SpotlightCard className="mt-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,14,0.9),rgba(3,9,7,0.95))] p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {FILTERS.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setQuery({ filter: key, page: 1 })}
                      className={`relative rounded-full px-3.5 py-1.5 text-[11px] font-black tracking-[0.04em] transition ${
                        filter === key ? 'text-emerald-950' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {filter === key ? (
                        <motion.span
                          layoutId="market-filter-pill"
                          className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,#6ee7b7,#34d399)]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      ) : null}
                      <span className="relative">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="relative w-full lg:max-w-[320px]">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="მოძებნე ფეხბურთელი…"
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-9 text-sm font-bold text-white outline-none transition placeholder:text-white/28 focus:border-emerald-300/30"
                  />
                  {searchDraft ? (
                    <button
                      type="button"
                      onClick={() => setSearchDraft('')}
                      className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-white/40 transition hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-black text-white/45 [font-variant-numeric:tabular-nums]">
                <span>
                  {loading ? 'იტვირთება…' : <><CountUp to={total} duration={0.8} separator=" " /> შედეგი</>}
                </span>
                <span>გვერდი {page}/{totalPages}</span>
              </div>
            </SpotlightCard>
          </LayoutGroup>
        )}

        {/* GRID */}
        <div className="mt-4">
          {loading ? (
            <MarketGridSkeleton count={isFreeAgents ? 5 : PAGE_SIZE} />
          ) : items.length === 0 ? (
            <EmptyState filter={filter} query={query} isFreeAgents={isFreeAgents} scoutHired={freeAgents?.scoutHired ?? true} />
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${moduleKey}-${filter}-${query}-${page}`}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              >
                {items.map((player, index) => (
                  <PlayerCard
                    key={player.key}
                    player={player}
                    index={index}
                    buying={buyingKey === player.key && pending}
                    contacting={contactingKey === player.key}
                    onBuy={() => buy(player)}
                    onOffer={() => setOfferTarget(player)}
                    onContact={() => contactSeller(player)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* PAGINATION (transfer market only) */}
        {!isFreeAgents && !loading && items.length > 0 && totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onGo={(next) => setQuery({ page: next })} />
        ) : null}
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            onAnimationComplete={() => window.setTimeout(() => setToast(null), 2400)}
            className={`fixed inset-x-0 bottom-5 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border px-5 py-3 text-sm font-black shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
              toast.ok ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-50' : 'border-red-400/40 bg-red-500/15 text-red-50'
            }`}
          >
            {toast.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {offerTarget ? (
          <OfferModal
            player={offerTarget}
            pending={pending}
            onClose={() => setOfferTarget(null)}
            onSubmit={(amount) => submitOffer(offerTarget, amount)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {inboxOpen ? (
          <OffersInbox
            offers={offers}
            loading={offersLoading}
            pending={pending}
            onClose={() => setInboxOpen(false)}
            onRespond={respondOffer}
            onWithdraw={withdrawOffer}
          />
        ) : null}
      </AnimatePresence>

      <PlayManagerBottomNav />
    </main>
  );
}

function OfferModal({
  player,
  pending,
  onClose,
  onSubmit,
}: {
  player: MarketPlayer;
  pending: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const floor = player.floorPrice ?? 1;
  const [value, setValue] = useState<string>(String(player.value || floor));
  const amount = Math.floor(Number(value.replace(/\s/g, '')) || 0);
  const belowFloor = amount > 0 && amount < floor;
  const valid = amount > 0 && !belowFloor;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[380px] rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,20,16,0.98),rgba(4,9,7,0.99))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/60">ფასის შეთავაზება</p>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-white/50 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-lg font-black text-white">{player.name}</p>
        <p className="text-[11px] font-black text-white/45">
          {player.position} · OVR {player.ovr}{player.sellerTeamName ? ` · ${player.sellerTeamName}` : ''}
        </p>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-black">
          <span className="text-white/45">მოთხოვნილი ფასი</span>
          <span className="text-emerald-100">{player.valueLabel}</span>
        </div>

        <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.16em] text-white/40">შენი შეთავაზება (₾)</label>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/[^\d\s]/g, ''))}
          inputMode="numeric"
          autoFocus
          className={`mt-1.5 h-12 w-full rounded-xl border bg-black/35 px-4 text-base font-black text-white outline-none transition [font-variant-numeric:tabular-nums] ${
            belowFloor ? 'border-red-400/50 focus:border-red-400/60' : 'border-white/10 focus:border-emerald-300/40'
          }`}
        />
        <p className={`mt-1.5 text-[10px] font-black ${belowFloor ? 'text-red-300' : 'text-white/40'}`}>
          მინიმალური ფასი: {floor.toLocaleString('ka-GE')} ₾ (ღირებულების 50%)
        </p>

        <button
          type="button"
          disabled={!valid || pending}
          onClick={() => onSubmit(amount)}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200/25 bg-[linear-gradient(180deg,#6ee7b7,#34d399)] px-3 py-3 text-sm font-black text-emerald-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Handshake className="h-4 w-4" />
          {pending ? 'იგზავნება…' : 'შეთავაზების გაგზავნა'}
        </button>
      </motion.div>
    </motion.div>
  );
}

function OffersInbox({
  offers,
  loading,
  pending,
  onClose,
  onRespond,
  onWithdraw,
}: {
  offers: TransferOfferItem[];
  loading: boolean;
  pending: boolean;
  onClose: () => void;
  onRespond: (offer: TransferOfferItem, action: 'accept' | 'reject' | 'counter', counterAmount?: number) => void;
  onWithdraw: (offer: TransferOfferItem) => void;
}) {
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counterValue, setCounterValue] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-[440px] flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(9,17,13,0.98),rgba(4,8,6,0.99))]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-emerald-200" />
            <p className="text-sm font-black text-white">სატრანსფერო შეთავაზებები</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-white/50 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && offers.length === 0 ? (
            <p className="py-10 text-center text-sm font-bold text-white/40">იტვირთება…</p>
          ) : offers.length === 0 ? (
            <p className="py-10 text-center text-sm font-bold text-white/40">აქტიური შეთავაზება არ არის</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {offers.map((offer) => {
                const isCountering = counterFor === offer.id;
                const counterAmount = Math.floor(Number(counterValue.replace(/\s/g, '')) || 0);
                const counterValid = counterAmount >= offer.floorPrice;
                return (
                  <div
                    key={offer.id}
                    className={`rounded-2xl border p-3.5 ${
                      offer.awaitingMe ? 'border-emerald-300/30 bg-emerald-300/[0.06]' : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{offer.playerName}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                          {offer.position} · OVR {offer.ovr}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${
                        offer.direction === 'incoming' ? 'bg-emerald-300/14 text-emerald-100' : 'bg-white/8 text-white/55'
                      }`}>
                        {offer.direction === 'incoming' ? 'შემომავალი' : 'გაგზავნილი'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] font-black">
                      <span className="text-white/45">{offer.iAmBuyer ? 'გამყიდველი' : 'მყიდველი'}: {offer.counterpartName}</span>
                      <span className="text-emerald-100 [font-variant-numeric:tabular-nums]">{offer.amount.toLocaleString('ka-GE')} ₾</span>
                    </div>

                    {offer.awaitingMe ? (
                      isCountering ? (
                        <div className="mt-3">
                          <input
                            value={counterValue}
                            onChange={(event) => setCounterValue(event.target.value.replace(/[^\d\s]/g, ''))}
                            inputMode="numeric"
                            autoFocus
                            placeholder={`მინ. ${offer.floorPrice.toLocaleString('ka-GE')} ₾`}
                            className="h-10 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-black text-white outline-none focus:border-emerald-300/40 [font-variant-numeric:tabular-nums]"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={!counterValid || pending}
                              onClick={() => { onRespond(offer, 'counter', counterAmount); setCounterFor(null); setCounterValue(''); }}
                              className="flex-1 rounded-lg border border-emerald-200/25 bg-emerald-300/15 px-3 py-2 text-xs font-black text-emerald-50 transition hover:bg-emerald-300/22 disabled:opacity-50"
                            >
                              გაგზავნა
                            </button>
                            <button
                              type="button"
                              onClick={() => { setCounterFor(null); setCounterValue(''); }}
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white/60 transition hover:text-white"
                            >
                              გაუქმება
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onRespond(offer, 'accept')}
                            className="rounded-lg border border-emerald-200/25 bg-[linear-gradient(180deg,#6ee7b7,#34d399)] px-2 py-2 text-xs font-black text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
                          >
                            მიღება
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => { setCounterFor(offer.id); setCounterValue(String(offer.amount)); }}
                            className="rounded-lg border border-white/12 bg-white/[0.05] px-2 py-2 text-xs font-black text-white/80 transition hover:text-white disabled:opacity-50"
                          >
                            საპასუხო
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onRespond(offer, 'reject')}
                            className="rounded-lg border border-red-400/25 bg-red-500/10 px-2 py-2 text-xs font-black text-red-100 transition hover:bg-red-500/16 disabled:opacity-50"
                          >
                            უარი
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] font-black text-white/35">მეორე მხარის პასუხის მოლოდინში</span>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onWithdraw(offer)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black text-white/55 transition hover:text-white disabled:opacity-50"
                        >
                          გაუქმება
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function CommandBar({
  team,
  manager,
  isFreeAgents,
  awaitingMe,
  offersCount,
  onOpenInbox,
}: {
  team: { name: string; balanceLabel: string; divisionLabel: string };
  manager: { name: string; avatarUrl: string | null };
  isFreeAgents: boolean;
  awaitingMe: number;
  offersCount: number;
  onOpenInbox: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
      <Link
        href="/playmanager"
        className="grid h-11 w-11 flex-none place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-white"
        aria-label="ქალაქში დაბრუნება"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[linear-gradient(145deg,rgba(110,231,183,0.26),rgba(255,255,255,0.05))] text-emerald-100">
        {isFreeAgents ? <Radar className="h-6 w-6" /> : <Store className="h-6 w-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/60">Transfer market</p>
        <h1 className="truncate text-xl font-black leading-tight sm:text-2xl">
          {isFreeAgents ? 'თავისუფალი აგენტები' : 'სატრანსფერო ბაზარი'}
        </h1>
      </div>
      <div className="flex items-center gap-2.5">
        {!isFreeAgents ? (
          <button
            type="button"
            onClick={onOpenInbox}
            className="relative grid h-11 w-11 flex-none place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-white"
            aria-label="სატრანსფერო შეთავაზებები"
          >
            <Inbox className="h-5 w-5" />
            {awaitingMe > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[linear-gradient(180deg,#6ee7b7,#34d399)] px-1 text-[10px] font-black text-emerald-950">
                {awaitingMe}
              </span>
            ) : offersCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a140f] bg-amber-300" />
            ) : null}
          </button>
        ) : null}
        <div className="hidden flex-col items-end rounded-2xl border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5 sm:flex">
          <span className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-200/60">ბალანსი</span>
          <span className="text-sm font-black text-emerald-100">{team.balanceLabel}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-2.5 py-1.5">
          <div className="hidden text-right sm:block">
            <p className="text-[9px] font-black text-white/38">{team.name} · {team.divisionLabel}</p>
            <p className="max-w-[140px] truncate text-[13px] font-black text-amber-100">{manager.name}</p>
          </div>
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/10">
            {manager.avatarUrl ? (
              <Image src={manager.avatarUrl} alt={manager.name} fill sizes="36px" className="object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-black text-white/70">{manager.name.slice(0, 1).toUpperCase()}</div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function PlayerCard({
  player,
  index,
  buying,
  contacting,
  onBuy,
  onOffer,
  onContact,
}: {
  player: MarketPlayer;
  index: number;
  buying: boolean;
  contacting: boolean;
  onBuy: () => void;
  onOffer: () => void;
  onContact: () => void;
}) {
  const isListing = Boolean(player.listingId);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="group overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,18,17,0.96),rgba(4,8,6,0.98))] p-3 shadow-[0_18px_46px_rgba(0,0,0,0.34)] transition hover:border-emerald-300/24"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black text-white">{player.name}</p>
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
            {player.position} · {player.age} წლის
          </p>
        </div>
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/8 text-sm font-black text-emerald-100">
          {player.ovr}
        </span>
      </div>

      <div className="mt-3 flex justify-center">
        <div className="h-[224px] w-[162px] overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]">
          <div style={{ transform: 'scale(0.64)', transformOrigin: 'top left' }} className="h-[347px] w-[251px]">
            <PlayerFutCard
              name={player.name}
              labelOverride={player.cardDisplayName}
              imageUrl={player.cardImageUrl}
              nationalityCode={player.nationalityCode}
              stats={player.stats}
              position={player.position}
              ovr={player.ovr}
              availability="ready"
              talent={player.talent}
              editorConfig={player.cardEditorConfig ?? DEFAULT_FUT_CARD_EDITOR_CONFIG}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <NestedMiniBox label="ფასი" value={player.valueLabel} valueClassName="text-emerald-100" />
        <TalentClassBadge talent={player.talent} size="sm" />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={buying}
          onClick={onBuy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200/25 bg-[linear-gradient(180deg,#6ee7b7,#34d399)] px-3 py-2.5 text-xs font-black text-emerald-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {buying ? 'მუშავდება…' : isListing ? 'ახლავე ყიდვა' : 'ყიდვა'}
        </button>
        {player.id ? (
          <Link
            href={`/playmanager/players/${player.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-black text-white/70 transition hover:border-emerald-300/20 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            ნახვა
          </Link>
        ) : null}
      </div>

      {isListing ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onOffer}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-black text-white/80 transition hover:border-emerald-300/25 hover:text-white"
          >
            <Handshake className="h-3.5 w-3.5" />
            შესთავაზე ფასი
          </button>
          <button
            type="button"
            disabled={contacting || !player.sellerUserId}
            onClick={onContact}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-black text-white/80 transition hover:border-emerald-300/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="დაუკავშირდი გამყიდველს"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {contacting ? '…' : 'ჩატი'}
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

function FreeAgentsBanner({ meta }: { meta: FreeAgentsMeta | null }) {
  return (
    <div className="mt-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,14,0.9),rgba(3,9,7,0.95))] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">
            {meta?.scoutHired ? `სკაუტი LVL ${meta.scoutLevel}/${meta.maxScoutLevel}` : 'სკაუტი არ არის დაქირავებული'}
          </p>
          <p className="mt-1.5 max-w-[640px] text-[11px] font-bold leading-5 text-white/52">
            {meta?.scoutHired
              ? `ყოველ 24 საათში 5 ახალი ფეხბურთელი · tier ${meta.tier} · შემდეგი განახლება ${meta.refreshLabel}`
              : `თავისუფალი აგენტების სია მხოლოდ დაქირავებულ სკაუტს მოაქვს. შენი დივიზიონი იძლევა მაქს. LVL ${meta?.maxScoutLevel ?? 1} სკაუტს.`}
          </p>
        </div>
        {meta?.scoutHired ? (
          <span className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
            5 შეთავაზება
          </span>
        ) : (
          <Link
            href="/playmanager/residence?module=staff"
            className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2.5 text-xs font-black text-emerald-50 transition hover:bg-emerald-300/16"
          >
            სკაუტის დაქირავება
          </Link>
        )}
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onGo }: { page: number; totalPages: number; onGo: (next: number) => void }) {
  const pages = useMemo(() => visiblePages(page, totalPages), [page, totalPages]);
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      <PageButton disabled={page <= 1} onClick={() => onGo(Math.max(1, page - 1))}>წინა</PageButton>
      {pages.map((value, index) => {
        const previous = pages[index - 1];
        const gap = previous !== undefined && value - previous > 1;
        return (
          <span key={value} className="flex items-center gap-2">
            {gap ? <span className="text-xs font-black text-white/25">…</span> : null}
            <button
              type="button"
              onClick={() => onGo(value)}
              className={`h-9 min-w-9 rounded-lg border px-3 text-xs font-black transition ${
                page === value
                  ? 'border-emerald-300/32 bg-emerald-300/14 text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-emerald-300/20 hover:text-white'
              }`}
            >
              {value}
            </button>
          </span>
        );
      })}
      <PageButton disabled={page >= totalPages} onClick={() => onGo(Math.min(totalPages, page + 1))}>შემდეგი</PageButton>
    </div>
  );
}

function PageButton({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white transition hover:border-emerald-300/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function visiblePages(page: number, totalPages: number): number[] {
  const set = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  return [...set].filter((value) => value >= 1 && value <= totalPages).sort((left, right) => left - right);
}

function MarketGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[26px] border border-white/8 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="h-9 w-9 animate-pulse rounded-xl bg-white/10" />
          </div>
          <div className="mx-auto mt-3 h-[224px] w-[162px] animate-pulse rounded-[20px] bg-white/[0.06]" />
          <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 flex gap-2">
            <div className="h-9 flex-1 animate-pulse rounded-xl bg-white/[0.06]" />
            <div className="h-9 w-16 animate-pulse rounded-xl bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  filter,
  query,
  isFreeAgents,
  scoutHired,
}: {
  filter: MarketFilterKey;
  query: string;
  isFreeAgents: boolean;
  scoutHired: boolean;
}) {
  const title = isFreeAgents
    ? scoutHired
      ? 'შეთავაზებები ჯერ არ არის'
      : 'სკაუტი არ არის დაქირავებული'
    : filter === 'SHORTLIST'
      ? 'შენახული სია ცარიელია'
      : 'შედეგი ვერ მოიძებნა';
  const hint = isFreeAgents
    ? 'დაიქირავე სკაუტი ოფისში და სია გამოჩნდება.'
    : filter === 'SHORTLIST'
      ? 'მოთამაშეები შენახულ სიაში დაამატე და აქ დაგხვდება.'
      : query.trim()
        ? 'სხვა საკვანძო სიტყვა ან ფილტრი სცადე.'
        : 'შეცვალე ფილტრი ან ძებნა გამოიყენე.';
  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] px-5 py-12 text-center">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-sm font-bold text-white/50">{hint}</p>
    </div>
  );
}
