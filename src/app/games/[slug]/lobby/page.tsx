import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Users, Rocket } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { ChevronButton } from "@/components/ui/chevron-button";
import { LobbyShell } from "@/components/lobby/lobby-shell";
import { LobbyStage } from "@/components/lobby/lobby-stage";
import { LobbyOrientationGuard } from "@/components/lobby/lobby-orientation";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMockHud } from "@/lib/lobby/mock-hud";
import { getWallet, getDailyBonusAvailable } from "@/lib/wallet/queries";
import { getEquippedItems } from "@/lib/shop/equip-queries";
import { getLobbyLoadout } from "@/lib/lobby/loadout-queries";

export const dynamicParams = true;

// slug → background image. Add a new entry per supported lobby.
const LOBBY_BG: Record<string, string> = {
  "pubg-mobile": "/lobbies/pubg-mobile-optimized.jpg",
};

const cutLg = "polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";
const WEBVIEW_USER_AGENT_RE = /(; wv\)|Electron|CEF|WebView|FBAN|FBAV|Instagram|Line\/|MicroMessenger)/i;

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ user?: string }>;
}) {
  const { slug } = await params;
  const { user: requestedUsername } = await searchParams;
  const userAgent = (await headers()).get("user-agent") ?? "";
  const showRotatePrompt = WEBVIEW_USER_AGENT_RE.test(userAgent);

  if (!LOBBY_BG[slug]) notFound();
  const game = mockGames.find((g) => g.slug === slug);
  if (!game) notFound();

  const user = await getSession().catch(() => null);
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  let displayName: string | null = null;
  let username: string | null = null;
  let avatarUrl: string | null = null;
  let level = 1;

  let lobbyUserId: string | null = null;
  if (requestedUsername) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, level")
      .eq("username", requestedUsername)
      .maybeSingle();
    if (!data) notFound();
    lobbyUserId = data?.id ?? null;
    username = data?.username ?? null;
    displayName = data?.display_name ?? null;
    avatarUrl = data?.avatar_url ?? null;
    level = data?.level ?? 1;
  } else if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, level")
      .eq("id", user.id)
      .maybeSingle();
    lobbyUserId = data?.id ?? user.id;
    username = data?.username ?? null;
    displayName = data?.display_name ?? null;
    avatarUrl = data?.avatar_url ?? null;
    level = data?.level ?? 1;
  }
  const canPersistLobby = !!(user?.id && lobbyUserId && user.id === lobbyUserId);

  let hudData = null;
  let lobbyEffect: { effect: string; color?: string } | null = null;
  let ownedDbCombos: { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> }[] = [];
  let ownedDbCharacters: { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> }[] = [];
  let ownedDbVehicles: { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> }[] = [];
  let ownedWeapons: { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> }[] = [];
  let lobbyInitialLoadout: { combo?: string; character?: string; vehicle?: string; lobby?: string; effect?: string; nameCard?: string } | null = null;
  let hasDbLoadout = false;

  if (lobbyUserId) {
    const hud = getMockHud(username ?? displayName ?? lobbyUserId);
    const [wallet, dailyBonusAvailable, equippedItems, comboRows, charRows, vehicleRows, weaponRows, savedLoadout] = await Promise.all([
      getWallet(lobbyUserId),
      getDailyBonusAvailable(lobbyUserId),
      getEquippedItems(lobbyUserId),
      adminSupabase
        .from("user_purchases")
        .select("shop_items!inner(id, name, tier, image_url, metadata)")
        .eq("user_id", lobbyUserId)
        .eq("shop_items.category", "combo")
        .then((r) => r.data ?? []),
      adminSupabase
        .from("user_purchases")
        .select("shop_items!inner(id, name, tier, image_url, metadata)")
        .eq("user_id", lobbyUserId)
        .eq("shop_items.category", "character")
        .then((r) => r.data ?? []),
      adminSupabase
        .from("user_purchases")
        .select("shop_items!inner(id, name, tier, image_url, metadata)")
        .eq("user_id", lobbyUserId)
        .eq("shop_items.category", "vehicle")
        .then((r) => r.data ?? []),
      adminSupabase
        .from("user_purchases")
        .select("shop_items!inner(id, name, tier, image_url, metadata)")
        .eq("user_id", lobbyUserId)
        .eq("shop_items.category", "weapon")
        .then((r) => r.data ?? []),
      getLobbyLoadout(lobbyUserId, slug),
    ]);
    ownedDbCombos = comboRows.map((row) => {
      const item = ((row as unknown) as { shop_items: { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> } }).shop_items;
      return item;
    });
    ownedDbCharacters = charRows.map((row) => {
      const item = ((row as unknown) as { shop_items: { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> } }).shop_items;
      return item;
    });
    ownedDbVehicles = vehicleRows.map((row) => {
      const item = ((row as unknown) as { shop_items: { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> } }).shop_items;
      return item;
    });
    ownedWeapons = weaponRows.map((row) => {
      const item = ((row as unknown) as { shop_items: { id: string; name: string; tier: string; image_url: string | null; metadata: Record<string, unknown> } }).shop_items;
      const isIcefire =
        (item.metadata?.weapon_id as string) === "m416_icefire" ||
        item.name?.toLowerCase().includes("icefire") ||
        (item.image_url ?? "").toLowerCase().includes("icefire");
      return {
        ...item,
        image_url: isIcefire ? "/weapons/m416-caucasus-icefire.png" : item.image_url,
      };
    }).filter((item) => {
      const isIcefire =
        (item.metadata?.weapon_id as string) === "m416_icefire" ||
        item.name?.toLowerCase().includes("icefire") ||
        (item.image_url ?? "").toLowerCase().includes("icefire");
      return !isIcefire;
    });
    ownedWeapons = [...ownedWeapons].sort((a, b) => {
      const aKey = `${a.name} ${a.image_url ?? ""}`.toLowerCase();
      const bKey = `${b.name} ${b.image_url ?? ""}`.toLowerCase();
      const aPriority = aKey.includes("m416-glacier") || aKey.includes("glacier")
        ? 0
        : aKey.includes("m416-caucasus-icefire") || aKey.includes("icefire")
          ? 1
          : 2;
      const bPriority = bKey.includes("m416-glacier") || bKey.includes("glacier")
        ? 0
        : bKey.includes("m416-caucasus-icefire") || bKey.includes("icefire")
          ? 1
          : 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      if (aKey.includes("m416") && !bKey.includes("m416")) return -1;
      if (!aKey.includes("m416") && bKey.includes("m416")) return 1;
      return a.name.localeCompare(b.name);
    });
    hudData = {
      ...hud,
      gameSlug: slug,
      player: {
        ...hud.player,
        displayName: displayName ?? username ?? "მოთამაშე",
        avatarUrl,
        level,
      },
      currencies: canPersistLobby
        ? { pro: wallet.pro_balance, nc: wallet.nc_balance }
        : null,
      dailyBonusAvailable: canPersistLobby ? dailyBonusAvailable : false,
    };

    const lobbyEffectItem = equippedItems.find((i) => i.category === "lobby_effect");
    if (lobbyEffectItem) {
      lobbyEffect = lobbyEffectItem.metadata as { effect: string; color?: string };
    }

    if (savedLoadout) {
      lobbyInitialLoadout = savedLoadout;
      hasDbLoadout = true;
    } else {
      const equippedComboItem = equippedItems.find((i) => i.category === "combo");
      const equippedCharItem = equippedItems.find((i) => i.category === "character");
      const equippedVehicleItem = equippedItems.find((i) => i.category === "vehicle");
      lobbyInitialLoadout = {
        combo: (equippedComboItem?.metadata.combo_id as string | undefined),
        character: (equippedCharItem?.metadata.character_id as string | undefined),
        vehicle: (equippedVehicleItem?.metadata.vehicle_id as string | undefined),
        effect: lobbyEffectItem ? "fx_fire" : undefined,
      };
    }
  }

  return (
    <div className="relative min-h-[calc(100svh-4rem)] bg-[var(--gr-bg-0)]">
      <LobbyOrientationGuard enabled={showRotatePrompt} />
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
        <header className="lobby-chrome lobby-page-header mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <DisplayHeading as="h1" size="lg" className="lobby-page-title">
              {game.nameKa} — ლობი
            </DisplayHeading>
            <ChevronButton
              href={`/lfg/new?game=${game.slug}`}
              variant="violet"
              size="md"
              className="lobby-page-cta shrink-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 text-[12px] text-white shadow-[0_0_28px_rgba(139,92,246,0.45)]"
              style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #C026D3 50%, #F5A524 100%)" }}
            >
              <Rocket className="h-4 w-4" /> თამაშის დაწყება
            </ChevronButton>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Pill tone="live" pulse>
              LIVE
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
            className="lobby-card-inner relative aspect-video w-full overflow-hidden bg-[#08060F]"
            style={{ clipPath: cutLg }}
          >
            <LobbyShell imageUrl={LOBBY_BG[slug]} eyebrow={`${game.nameEn} · ლობის გახსნა`}>
            <LobbyStage
              gameName={game.nameKa}
              gameSlug={slug}
              imageUrl={LOBBY_BG[slug]}
              hudData={hudData}
              currentUserId={canPersistLobby ? user?.id ?? null : null}
              lobbyEffect={lobbyEffect}
              ownedDbCombos={ownedDbCombos}
              ownedDbCharacters={ownedDbCharacters}
              ownedDbVehicles={ownedDbVehicles}
              ownedWeapons={ownedWeapons}
              initialLoadout={lobbyInitialLoadout ?? undefined}
              hasDbLoadout={hasDbLoadout}
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

        {/* action bar */}
        <div className="lobby-chrome lobby-page-actions mt-4 flex justify-end">
          <ChevronButton href={`/games/${game.slug}`} variant="ghost" size="md" className="text-[12px]">
            თამაშის გვერდი
          </ChevronButton>
        </div>

      </div>
    </div>
  );
}
