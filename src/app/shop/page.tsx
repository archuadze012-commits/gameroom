import Link from "next/link";
import { ArrowRight, Crown, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWallet } from "@/lib/wallet/queries";
import { getGlobalShopItems } from "@/lib/shop/queries";
import { getActiveShopProducts } from "@/lib/shop-products/queries";
import { ShopGrid } from "@/components/shop/shop-grid";
import { ShopProductCard } from "@/components/shop/shop-product-card";
import { LobbyCurrencyStrip } from "@/components/lobby/lobby-currency-strip";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Button } from "@/components/ui/button";
import { formatGel, STATUS_LABELS } from "@/lib/shop-products/types";

export const metadata = { title: "შოპი" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const { mine } = await searchParams;
  const isMine = mine === "true";

  const user = await getSession().catch(() => null);
  const supabase = await createSupabaseServerClient();

  let favSlugs: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("favorite_game_slugs")
      .eq("id", user.id)
      .maybeSingle();
    favSlugs = data?.favorite_game_slugs ?? [];
  }

  const [globalItems, wallet, shopProducts] = await Promise.all([
    getGlobalShopItems(user?.id ?? null),
    user ? getWallet(user.id) : Promise.resolve({ nc_balance: 0, pro_balance: 0 }),
    getActiveShopProducts(),
  ]);

  const favoriteGames = favSlugs.length > 0
    ? mockGames.filter((g) => favSlugs.includes(g.slug))
    : mockGames;

  const displayItems = isMine ? globalItems.filter((i) => i.owned) : globalItems;
  const featuredProduct = shopProducts[0];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#05050f]">
      {/* Premium Cinematic Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_70%)]" />

      <div className="container relative mx-auto max-w-6xl px-4 py-8 lg:py-10">
        
        {/* Header - Premium Glass Wrapper */}
        <header className="mb-8 group relative rounded-[24px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]">
          <div className="relative h-full w-full overflow-hidden rounded-[22.5px] bg-[#0a0714] p-5 sm:p-6 shadow-[inset_0_0_30px_rgba(139,92,246,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                  <ShoppingBag className="h-5 w-5 text-violet-400" />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">GAMEROOM ARSENAL</p>
                  <DisplayHeading as="h1" size="lg" className="drop-shadow-md">
                    {isMine ? "ჩემი ნივთები" : "შოპი"}
                  </DisplayHeading>
                </div>
              </div>

              {user && (
                <LobbyCurrencyStrip currencies={{ pro: wallet.pro_balance, nc: wallet.nc_balance }} />
              )}
            </div>
            {/* Divider line inside glass */}
            <div
              aria-hidden
              className="mt-5 h-[1px] w-full"
              style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.5),rgba(236,72,153,0.5),transparent)" }}
            />
          </div>
        </header>

        {!isMine && (
          <section className="mb-10">
            {featuredProduct && (
              <div className="mb-8 group relative rounded-[24px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                <div className="relative h-full w-full overflow-hidden rounded-[22.5px] bg-[#0a0714] grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
                  
                  <Link
                    href={`/shop/products/${featuredProduct.id}`}
                    className="group/img relative min-h-[300px] overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_60%)]"
                  >
                    {/* Pink/Cyan highlight line */}
                    <div aria-hidden className="absolute inset-x-8 bottom-8 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.5),rgba(236,72,153,0.5),transparent)]" />
                    
                    {featuredProduct.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featuredProduct.image_url}
                        alt={featuredProduct.title}
                        className="relative z-[2] h-full min-h-[300px] w-full object-contain p-6 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-transform duration-700 ease-out group-hover/img:scale-[1.05]"
                      />
                    ) : (
                      <div className="relative z-[2] grid min-h-[300px] place-items-center">
                        <Crown className="h-24 w-24 text-violet-500/50 drop-shadow-[0_0_30px_rgba(139,92,246,0.4)]" />
                      </div>
                    )}
                  </Link>

                  <div className="relative flex flex-col justify-center p-6 sm:p-8 bg-black/40 border-l border-white/5">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                        <Crown className="h-3.5 w-3.5" />
                        Mythic Drop
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {STATUS_LABELS[featuredProduct.status]}
                      </span>
                    </div>
                    
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-400 drop-shadow-sm">Featured Item</p>
                    <h2 className="mt-2 font-display text-3xl font-black uppercase leading-none text-white drop-shadow-md sm:text-4xl">
                      {featuredProduct.title}
                    </h2>
                    <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-white/60">
                      {featuredProduct.description || "Premium Gameroom marketplace item."}
                    </p>
                    
                    <div className="my-6 h-px w-full bg-[linear-gradient(90deg,rgba(139,92,246,0.3),rgba(236,72,153,0.3),transparent)]" />
                    
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Price</p>
                        <p className="font-display text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{formatGel(featuredProduct.price)}</p>
                      </div>
                      
                      <Button asChild className="h-12 rounded-full border border-pink-500/50 bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] px-8 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]">
                        <Link href={`/shop/products/${featuredProduct.id}`}>
                          Inspect
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                  ELITE MARKET
                </p>
                <h2 className="font-display text-3xl font-black uppercase text-white drop-shadow-md">
                  Marketplace
                </h2>
              </div>
              <p className="max-w-xl text-[14px] text-white/50">
                აქტიური პროდუქტები, ქართული gaming community-სთვის. გადახდა ჯერ არ არის ჩართული, დეტალებზე გამოიყენე contact.
              </p>
            </div>

            {shopProducts.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shopProducts.map((product) => (
                  <ShopProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-4 py-16 text-center text-[14px] font-bold text-white/40">
                No products available yet.
              </div>
            )}
          </section>
        )}

        {/* game shops — hidden in "mine" mode */}
        {!isMine && (
          <section className="mb-10 mt-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
                  Game arsenals
                </p>
                <h2 className="font-display text-3xl font-black uppercase text-white drop-shadow-md">
                  🎮 თამაშების შოპები
                </h2>
              </div>
              <p className="max-w-xl text-[14px] text-white/50">
                აირჩიე თამაში და ნახე შესაბამისი crates, skins და lobby rewards.
              </p>
            </div>
            
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteGames.map((game) => (
                <Link
                  key={game.slug}
                  href={`/shop/${game.slug}`}
                  className="group relative block rounded-[20px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-1"
                >
                  <div className="relative flex h-full min-h-[170px] overflow-hidden rounded-[18.5px] bg-[#0a0714]">
                    <div className="relative grid w-36 shrink-0 place-items-center bg-[radial-gradient(circle_at_50%_12%,rgba(139,92,246,0.15),transparent_60%)] border-r border-white/5">
                      {game.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={game.iconUrl} alt={game.nameKa} className="h-20 w-20 rounded-[16px] object-cover ring-1 ring-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-transform duration-500 group-hover:scale-105 group-hover:ring-pink-500/50" />
                      ) : (
                        <span className="text-5xl transition-transform duration-500 group-hover:scale-105 drop-shadow-lg">{game.emoji}</span>
                      )}
                    </div>
                    
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-400">
                          <Sparkles className="h-2.5 w-2.5" />
                          Game shop
                        </span>
                        <h3 className="mt-4 font-display text-2xl font-black uppercase leading-none text-white drop-shadow-md">
                          {game.nameKa}
                        </h3>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-pink-400 transition-colors group-hover:text-cyan-400">
                        Inspect arsenal <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* profile customization items */}
        {displayItems.length > 0 ? (
          <section className="mt-16">
            <p className="mb-6 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.2em] text-white/50">
              <span className="h-px w-8 bg-white/10" />
              {isMine ? "👤 შეძენილი ნივთები" : "🎨 პროფილის Customization"}
              <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(255,255,255,0.1),transparent)]" />
            </p>
            <ShopGrid items={displayItems} hasSession={!!user} />
          </section>
        ) : isMine ? (
          <p className="rounded-[24px] border border-dashed border-white/10 bg-white/5 py-16 text-center text-[14px] text-white/40">
            ჯერ არაფერი გაქვს შეძენილი.{" "}
            <Link href="/shop" className="text-violet-400 transition-colors hover:text-pink-400 hover:underline">შოპში გადასვლა</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
