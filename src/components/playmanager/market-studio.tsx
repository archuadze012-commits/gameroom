'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Check, Search, X } from 'lucide-react';
import { buyPlayManagerMarketPlayer } from '@/app/playmanager/actions/market-actions';
import {
  buyPlayManagerListedPlayer,
  makePlayManagerTransferOffer,
  respondPlayManagerTransferOffer,
  cancelPlayManagerTransferOffer,
} from '@/app/playmanager/actions/transfer-actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
import CountUp from '@/components/CountUp';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';


import {
  FILTERS,
  PAGE_SIZE,
  OfferModal,
  OffersInbox,
  CommandBar,
  PlayerCard,
  FreeAgentsBanner,
  Pagination,
  MarketGridSkeleton,
  EmptyState,
  type MarketFilterKey,
  type MarketPlayer,
  type TransferOfferItem,
  type FreeAgentsMeta,
} from './market-studio-parts';

export function MarketStudio({
  team,
  manager,
}: {
  team: { id: string; name: string; balanceLabel: string; divisionLabel: string };
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
  // Deep-link: ?offers=1 (e.g. from an offer-received notification) opens the
  // inbox drawer on first render — derived as initial state, no mount effect.
  const [inboxOpen, setInboxOpen] = useState(() => searchParams.get('offers') === '1');
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

  // Keep the transfer-market inbox live. A Supabase realtime subscription on
  // pm_transfer_offers (scoped to this team via two filters — offers where we're
  // the from/to side) refetches the shaped list on any change, replacing the old
  // 20s poll. A 60s fallback poll covers a dropped socket; the free-agents tab
  // has no offers so it skips all of this.
  useEffect(() => {
    if (isFreeAgents) return;
    // Fetch-on-mount; loadOffers flips a loading flag synchronously — intended
    // spinner behaviour, not a cascading-render bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOffers();

    const supabase = createSupabaseBrowserClient();
    // Coalesce the burst of events an accept/counter emits into one refetch.
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(loadOffers, 300);
    };
    const channel = supabase
      .channel(`pm-offers:${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_transfer_offers', filter: `to_team_id=eq.${team.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_transfer_offers', filter: `from_team_id=eq.${team.id}` }, refresh)
      .subscribe();

    const fallback = window.setInterval(loadOffers, 60_000);

    return () => {
      clearTimeout(debounce);
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [isFreeAgents, loadOffers, team.id]);

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
    <main className="pm-hq-home pm-feedskin pm-hq-shell relative min-h-screen overflow-x-hidden bg-[#04100a] pb-24 text-white xl:pb-16 xl:pl-[116px]">
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
                    currentTeamId={team.id}
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
