import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Crown, ShieldCheck, ShoppingBag } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { getGameShopItems } from "@/lib/shop/queries";
import { getWallet } from "@/lib/wallet/queries";
import { getActiveBoxes } from "@/lib/events/queries";
import { ShopGrid } from "@/components/shop/shop-grid";
import { LobbyCurrencyStrip } from "@/components/lobby/lobby-currency-strip";
import { DisplayHeading } from "@/components/ui/display-heading";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = mockGames.find((g) => g.slug === slug);
  return { title: game ? `${game.nameKa} — შოპი` : "შოპი" };
}

export default async function GameShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = mockGames.find((g) => g.slug === slug);
  if (!game) notFound();

  const user = await getSession().catch(() => null);
  const [items, wallet, boxes] = await Promise.all([
    getGameShopItems(user?.id ?? null, slug),
    user ? getWallet(user.id) : Promise.resolve({ nc_balance: 0, pro_balance: 0 }),
    getActiveBoxes(),
  ]);

  const featuredBox = boxes.find((box) =>
    box.name.toLowerCase().includes("კავკას") ||
    box.items.some((item) => item.item_name.toLowerCase().includes("caucasus") || item.item_name.toLowerCase().includes("icefire"))
  ) ?? boxes[0];
  const featuredItem = featuredBox
    ? [...featuredBox.items]
        .sort((a, b) => {
          const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
          return order[a.tier] - order[b.tier];
        })
        .find((item) => item.image_url)
    : null;
  const featuredImage = featuredItem?.image_url ?? featuredBox?.image_url;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Cinematic Ambient Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />

      <div className="container relative mx-auto max-w-6xl px-4 py-8 lg:py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            href={`/games/${slug}/lobby`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50 transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {game.nameKa} / ლობი
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-10 group neon-frame rounded-[24px]">
          <div className="relative h-full w-full overflow-hidden rounded-[22.5px] bg-[#0a0714] p-5 sm:p-6 shadow-[inset_0_0_30px_rgba(139,92,246,0.05)] backdrop-blur-md">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_50%)]" />
            
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-pink-500/30 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                  <ShoppingBag className="h-6 w-6 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                </span>
                <div>
                  <DisplayHeading as="h1" size="lg" className="mt-1 drop-shadow-md">
                    {game.nameKa} — შოპი
                  </DisplayHeading>
                </div>
              </div>

              {user && (
                <LobbyCurrencyStrip currencies={{ pro: wallet.pro_balance, nc: wallet.nc_balance }} />
              )}
            </div>
          </div>
        </header>

        {featuredBox && (
          <section className="mb-12 group neon-frame rounded-[24px]">
            <div className="relative grid overflow-hidden rounded-[22.5px] bg-[#0a0714] lg:grid-cols-[1.35fr_0.65fr]">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.1),transparent_60%)]" />
              
              <Link
                href="#crate-drops"
                className="group/img relative flex min-h-[360px] flex-col overflow-hidden p-6 sm:p-8"
              >


                <div className="relative mt-8 flex flex-1 items-center justify-center">
                  <div aria-hidden className="absolute inset-x-[10%] bottom-8 h-px bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.5),rgba(236,72,153,0.5),transparent)]" />
                  {featuredImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredImage}
                      alt={featuredItem?.item_name ?? featuredBox.name}
                      className="relative z-[2] max-h-[280px] w-full object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover/img:scale-110"
                    />
                  ) : (
                    <Crown className="relative z-[2] h-28 w-28 text-white/20 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" />
                  )}
                </div>
              </Link>

              <aside className="relative z-[2] flex flex-col justify-center border-t border-white/5 bg-black/40 p-6 sm:p-8 lg:border-l lg:border-t-0">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    <Crown className="h-3 w-3" />
                    Featured Drop
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                    <ShieldCheck className="h-3 w-3" />
                    Active crate
                  </span>
                </div>
                

                <h2 className="mt-2 font-display text-4xl font-black uppercase leading-none text-white drop-shadow-md sm:text-5xl">
                  {featuredItem?.item_name ?? featuredBox.name}
                </h2>

                
                <div className="my-6 h-px bg-[linear-gradient(90deg,rgba(245,158,11,0.5),rgba(236,72,153,0.5),transparent)]" />
                
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>

                    <p className="font-display text-3xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                      {featuredBox.cost_amount} <span className="text-[14px]">{featuredBox.cost_currency.toUpperCase()}</span>
                    </p>
                  </div>
                  <Link
                    href="#crate-drops"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-amber-500/50 bg-[linear-gradient(135deg,#f59e0b,#ea580c)] px-6 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                  >
                    გახსნა
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </aside>
            </div>
          </section>
        )}

        <div id="crate-drops">
          <ShopGrid items={items} hasSession={!!user} variant="game" premiumBoxes={boxes} />
        </div>
      </div>
    </div>
  );
}
