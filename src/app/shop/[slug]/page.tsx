import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { getGameShopItems } from "@/lib/shop/queries";
import { getWallet } from "@/lib/wallet/queries";
import { getActiveBoxes } from "@/lib/events/queries";
import { ShopGrid } from "@/components/shop/shop-grid";
import { ShopCrates } from "@/components/shop/shop-crates";
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

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-6xl px-4 py-8 lg:py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <Link
            href={`/games/${slug}/lobby`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {game.nameKa} / ლობი
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-[var(--gr-amber)]" />
            <DisplayHeading as="h1" size="lg">
              {game.nameKa} — შოპი
            </DisplayHeading>
            <span className="text-xl">{game.emoji}</span>
          </div>

          {user && (
            <LobbyCurrencyStrip currencies={{ pro: wallet.pro_balance, nc: wallet.nc_balance }} />
          )}
        </header>

        <ShopGrid items={items} hasSession={!!user} variant="game" />
        <ShopCrates boxes={boxes} hasSession={!!user} />
      </div>
    </div>
  );
}
