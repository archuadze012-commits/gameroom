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
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";

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
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Premium Cinematic Background */}
      <CinematicBackground color="violet" />

      <div className="container relative mx-auto max-w-6xl px-4 py-8 lg:py-10">
        
        <PageHeader
          color="cyan"
          title={
            <span className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                <ShoppingBag className="h-5 w-5 text-violet-400" />
              </span>
              <span>{isMine ? "ჩემი ნივთები" : "შოპი"}</span>
            </span>
          }
          actions={user && <LobbyCurrencyStrip currencies={{ pro: wallet.pro_balance, nc: wallet.nc_balance }} />}
        />



        {/* game shops — hidden in "mine" mode */}
        {!isMine && (
          <section className="mb-10 mt-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl font-black uppercase text-white drop-shadow-md">
                  თამაშების შოპები
                </h2>
              </div>
            </div>
            
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteGames.map((game) => (
                <Link
                  key={game.slug}
                  href={`/shop/${game.slug}`}
                  className="group neon-frame block rounded-[20px]"
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
                    
                    <div className="flex min-w-0 flex-1 flex-col justify-center p-5">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-400">
                          <Sparkles className="h-2.5 w-2.5" />
                          Game shop
                        </span>
                        <h3 className="mt-4 font-display text-2xl font-black uppercase leading-none text-white drop-shadow-md">
                          {game.nameKa}
                        </h3>
                      </div>
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
