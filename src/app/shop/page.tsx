import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWallet } from "@/lib/wallet/queries";
import { getGlobalShopItems } from "@/lib/shop/queries";
import { ShopGrid } from "@/components/shop/shop-grid";
import { LobbyCurrencyStrip } from "@/components/lobby/lobby-currency-strip";
import { DisplayHeading } from "@/components/ui/display-heading";

export const metadata = { title: "შოპი" };

const cutSm = "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)";

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

  const [globalItems, wallet] = await Promise.all([
    getGlobalShopItems(user?.id ?? null),
    user ? getWallet(user.id) : Promise.resolve({ nc_balance: 0, pro_balance: 0 }),
  ]);

  const favoriteGames = favSlugs.length > 0
    ? mockGames.filter((g) => favSlugs.includes(g.slug))
    : mockGames;

  const displayItems = isMine ? globalItems.filter((i) => i.owned) : globalItems;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-6xl px-4 py-8 lg:py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-[var(--gr-amber)]" />
            <DisplayHeading as="h1" size="lg">
              {isMine ? "ჩემი ნივთები" : "შოპი"}
            </DisplayHeading>
          </div>

          {user && (
            <LobbyCurrencyStrip currencies={{ pro: wallet.pro_balance, nc: wallet.nc_balance }} />
          )}
        </header>

        {/* game shops — hidden in "mine" mode */}
        {!isMine && (
          <section className="mb-10">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
              🎮 თამაშების შოპები
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
              {favoriteGames.map((game) => (
                <Link
                  key={game.slug}
                  href={`/shop/${game.slug}`}
                  className="group relative isolate block overflow-hidden transition-all duration-300 group-hover:[--game-btn-border:rgba(236,72,153,0.85)]"
                  style={{
                    clipPath: "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)",
                    background: "var(--game-btn-border, rgba(167,139,250,0.55))",
                    padding: 1,
                  }}
                >
                  {/* inner */}
                  <div
                    className="relative flex flex-col items-center gap-2.5 overflow-hidden px-4 py-5"
                    style={{
                      clipPath: "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)",
                      background: "linear-gradient(160deg,var(--gr-bg-1) 0%,var(--gr-bg-0) 100%)",
                    }}
                  >
                    {/* permanent violet top-line */}
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 z-10 h-[2px] w-full"
                      style={{ background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.8),transparent)" }}
                    />
                    {/* magenta laser on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full
                                 translate-x-[-100%] opacity-0
                                 group-hover:translate-x-[100%] group-hover:opacity-100
                                 group-hover:transition-transform group-hover:duration-700"
                      style={{ background: "linear-gradient(90deg,transparent,rgba(236,72,153,0.9),transparent)" }}
                    />
                    {/* subtle violet glow always */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(167,139,250,0.10) 0%,transparent 65%)" }}
                    />
                    {/* magenta glow on hover */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(236,72,153,0.13) 0%,transparent 65%)" }}
                    />

                    {game.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={game.iconUrl}
                        alt={game.nameKa}
                        className="relative z-[2] h-12 w-12 rounded-lg object-cover ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <span className="relative z-[2] text-3xl transition-transform duration-300 group-hover:scale-110">{game.emoji}</span>
                    )}
                    <p className="relative z-[2] text-center font-display text-[11px] font-extrabold uppercase leading-tight tracking-tight text-white">
                      {game.nameKa}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}


        {/* global / owned items */}
        {displayItems.length > 0 ? (
          <section>
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
              {isMine ? "👤 შეძენილი ნივთები" : "🎨 პროფილის Customization"}
            </p>
            <ShopGrid items={displayItems} hasSession={!!user} />
          </section>
        ) : isMine ? (
          <p className="border border-dashed border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)]/40 py-12 text-center text-[13px] text-[var(--gr-text-mute)]">
            ჯერ არაფერი გაქვს შეძენილი.{" "}
            <Link href="/shop" className="text-[var(--gr-violet-hi)] hover:underline">შოპში გადასვლა</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
