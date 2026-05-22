import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, Rocket } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { ChevronButton } from "@/components/ui/chevron-button";
import { LobbyShell } from "@/components/lobby/lobby-shell";
import { LobbyCanvas } from "@/components/lobby/lobby-canvas";
import { LobbyInventory } from "@/components/lobby/lobby-inventory";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamicParams = true;

// slug → background image. Add a new entry per supported lobby.
const LOBBY_BG: Record<string, string> = {
  "pubg-mobile": "/lobbies/pubg-mobile.png",
};

const cutLg = "polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = mockGames.find((g) => g.slug === slug);
  return {
    title: game ? `${game.nameKa} — ლობი` : "ლობი",
  };
}

export default async function GameLobbyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!LOBBY_BG[slug]) notFound();
  const game = mockGames.find((g) => g.slug === slug);
  if (!game) notFound();

  const user = await getSession().catch(() => null);
  let displayName: string | null = null;
  let username: string | null = null;
  let avatarUrl: string | null = null;
  let level = 1;
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, level")
      .eq("id", user.id)
      .maybeSingle();
    username = data?.username ?? null;
    displayName = data?.display_name ?? null;
    avatarUrl = data?.avatar_url ?? null;
    level = data?.level ?? 1;
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="lobby-fs-wrap container relative mx-auto max-w-6xl px-4 py-8 lg:py-10">
        {/* breadcrumb / back */}
        <nav aria-label="Breadcrumb" className="lobby-chrome mb-4">
          <Link
            href={`/games/${game.slug}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {game.nameKa} / ლობი
          </Link>
        </nav>

        {/* page header */}
        <header className="lobby-chrome mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow tone="amber">{game.nameEn}</Eyebrow>
            <DisplayHeading as="h1" size="lg" className="mt-3">
              {game.nameKa} — ლობი
            </DisplayHeading>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Pill tone="live" pulse>
              ცოცხალი
            </Pill>
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">
              <Users className="mr-1 inline h-3 w-3 -translate-y-px" />
              {game.players.toLocaleString("en-US")} ონლაინ
            </span>
          </div>
        </header>

        {/* lobby card — gradient border, cut corner, image inside */}
        <article
          className="lobby-card-outer relative isolate"
          style={{ background: cardBorder, padding: 1, clipPath: cutLg }}
        >
          <div
            className="lobby-card-inner relative aspect-[2/1] w-full overflow-hidden bg-[#08060F]"
            style={{ clipPath: cutLg }}
          >
            <LobbyShell imageUrl={LOBBY_BG[slug]} eyebrow={`${game.nameEn} · ლობის გახსნა`}>
            <Image
              src={LOBBY_BG[slug]}
              alt={`${game.nameKa} lobby`}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1152px"
              className="object-cover object-center"
            />
            <LobbyCanvas />
            <LobbyInventory />

            {/* in-lobby HUD: top-left user chip — avatar 1:1 + name */}
            {user && (
              <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 bg-black/45 px-1.5 py-1 ring-1 ring-white/15 backdrop-blur-md sm:left-4 sm:top-4 sm:gap-2.5 sm:px-2 sm:py-1.5"
                style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)" }}
              >
                <div
                  className="relative h-6 w-6 shrink-0 overflow-hidden ring-1 ring-[var(--gr-violet-hi)]/50 sm:h-9 sm:w-9"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 4px 100%, 0 calc(100% - 4px))" }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName ?? username ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-[var(--gr-grad-violet)] text-[11px] font-bold uppercase text-white sm:text-[14px]">
                      {(displayName ?? username ?? "?").slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 pr-1">
                  <div className="truncate font-display text-[10px] font-bold uppercase leading-none tracking-tight text-white sm:text-[13px]"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.85)" }}
                  >
                    {displayName ?? username ?? "მოთამაშე"}
                  </div>
                </div>
              </div>
            )}

            {/* atmospheric integration */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#08060F]/85 via-[#08060F]/30 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0 2px, rgba(255,255,255,0.6) 2px 3px)",
              }}
            />


            </LobbyShell>
          </div>
        </article>

        {/* description + action bar */}
        <div className="lobby-chrome mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <p className="text-[14px] leading-relaxed text-[var(--gr-text-mute)]">
            {game.description}
          </p>
          <div className="flex flex-wrap items-start gap-2 lg:justify-end">
            <ChevronButton href={`/lfg/new?game=${game.slug}`} variant="amber" size="md">
              <Rocket className="h-4 w-4" /> თამაშის დაწყება
            </ChevronButton>
            <ChevronButton href={`/lfg?game=${game.slug}`} variant="ghost" size="md">
              LFG ნახე
            </ChevronButton>
            <ChevronButton href={`/games/${game.slug}`} variant="ghost" size="md">
              თამაშის გვერდი
            </ChevronButton>
          </div>
        </div>
      </div>
    </div>
  );
}
