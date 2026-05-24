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
                  className="group relative flex flex-col items-center gap-2.5 bg-[var(--gr-bg-1)] p-4 ring-1 ring-[var(--gr-border)] transition hover:ring-[var(--gr-border-hi)] hover:brightness-110"
                  style={{ clipPath: cutSm }}
                >
                  {game.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={game.iconUrl} alt={game.nameKa} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="text-3xl">{game.emoji}</span>
                  )}
                  <p className="text-center font-display text-[11px] font-extrabold uppercase leading-tight tracking-tight text-white">
                    {game.nameKa}
                  </p>
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
