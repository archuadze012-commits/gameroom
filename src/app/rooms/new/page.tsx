import Link from "next/link";
import { redirect } from "next/navigation";
import { DoorOpen, Lock, MapPin, Users as UsersIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import { mockGames } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateRoomWidget } from "./create-room-widget";
import { CopyRoomCodeButton } from "./copy-room-code-button";
import { CloseRoomButton } from "./close-room-button";

export const metadata = { title: "Classic რუმები" };
export const dynamic = "force-dynamic";

type RoomRow = {
  id: string;
  room_code: string;
  game_slug: string;
  mode: string;
  title: string;
  map: string | null;
  perspective: string;
  max_players: number;
  current_players: number;
  is_private: boolean;
  notes: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  host_id: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cutSm = "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)";

const ROOM_MODES = [
  { key: "classic", label: "Classic რუმები" },
  { key: "tdm", label: "TDM რუმები" },
  { key: "wow", label: "WOW რუმები" },
] as const;

export default async function NewRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const gameSlug = params.game ?? "pubg-mobile";
  const mode = params.mode ?? "classic";

  const user = await getSession().catch(() => null);
  const supabase = await createSupabaseServerClient();

  const game = mockGames.find((g) => g.slug === gameSlug);

  // Fetch open, non-expired rooms for this game + mode
  const { data } = await supabase
    .from("game_rooms")
    .select(
      "id, room_code, game_slug, mode, title, map, perspective, max_players, current_players, is_private, notes, status, created_at, expires_at, host_id, profiles!game_rooms_host_id_fkey(username, display_name, avatar_url)"
    )
    .eq("game_slug", gameSlug)
    .eq("mode", mode)
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  let rooms = (data ?? []) as unknown as RoomRow[];
  if (rooms.length > 1) {
    const hostIds = [...new Set(rooms.map((r) => r.host_id))];
    const { data: fc } = await supabase.from("follows").select("following_id").in("following_id", hostIds);
    const fcMap: Record<string, number> = {};
    (fc ?? []).forEach((f) => { fcMap[f.following_id] = (fcMap[f.following_id] || 0) + 1; });
    rooms = [...rooms].sort((a, b) => (fcMap[b.host_id] || 0) - (fcMap[a.host_id] || 0));
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-5xl px-4 py-8 lg:py-10">
        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <Link
            href={`/games/${gameSlug}/lobby`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
          >
            ← {game?.nameKa ?? gameSlug} / ლობი
          </Link>
        </nav>

        {/* header — mode selector */}
        <header className="mb-8">
          <div
            className="flex flex-col gap-1.5 bg-[var(--gr-bg-1)] p-1 ring-1 ring-[var(--gr-border)] sm:inline-flex sm:flex-row sm:flex-wrap sm:items-center"
            style={{ clipPath: cutSm }}
          >
            {ROOM_MODES.map((m) => {
              const active = m.key === mode;
              return (
                <Link
                  key={m.key}
                  href={`/rooms/new?game=${gameSlug}&mode=${m.key}`}
                  className={`relative px-4 py-2 text-center font-display text-[12px] font-bold uppercase tracking-[0.16em] transition-colors sm:text-[13px] ${
                    active
                      ? "bg-gradient-to-r from-[var(--gr-violet)] to-[var(--gr-magenta)] text-white shadow-[0_0_18px_rgba(139,92,246,0.35)]"
                      : "text-[var(--gr-text-mute)] hover:bg-white/5 hover:text-white"
                  }`}
                  style={active ? { clipPath: cutSm } : undefined}
                >
                  {m.label}
                </Link>
              );
            })}
          </div>
        </header>

        <div>
          {/* Create-room widget (above the list) */}
          {user ? (
            <CreateRoomWidget gameSlug={gameSlug} hostId={user.id} mode={mode} />
          ) : (
            <div
              className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-[var(--gr-bg-1)] px-5 py-3 ring-1 ring-[var(--gr-border)]"
              style={{ clipPath: cutSm }}
            >
              <p className="text-[13px] text-[var(--gr-text-mute)]">
                რუმის შესაქმნელად შედი ანგარიშში.
              </p>
              <Link
                href={`/auth/login?next=/rooms/new?game=${gameSlug}`}
                className="inline-flex items-center gap-2 bg-[var(--gr-violet)]/15 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-violet)]/40 hover:bg-[var(--gr-violet)]/25"
              >
                შესვლა
              </Link>
            </div>
          )}

          {/* Rooms list */}
          <section>
            <h2 className="mb-4 font-display text-[14px] font-bold uppercase tracking-[0.18em] text-white">
              LIVE რუმები <span className="ml-2 text-[var(--gr-text-dim)]">({rooms.length})</span>
            </h2>

            {rooms.length === 0 ? (
              <EmptyState
                tone="violet"
                illustration={<DoorOpen className="h-9 w-9 text-[var(--gr-violet-hi)]" />}
                title="ცარიელია"
                description="ჯერ არცერთი რუმი არ შექმნილა. გახდი პირველი — შექმენი რუმი ზემოთ."
              />
            ) : (
              <div className="grid gap-3">
                {rooms.map((room) => {
                  const host = room.profiles;
                  const name = host?.display_name ?? host?.username ?? "მომხმარებელი";
                  const initial = name.slice(0, 1).toUpperCase();
                  const created = (() => {
                    try {
                      return formatDistanceToNow(new Date(room.created_at), { addSuffix: true, locale: ka });
                    } catch {
                      return "";
                    }
                  })();
                  const full = room.current_players >= room.max_players;

                  return (
                    <article
                      key={room.id}
                      className="group relative bg-[var(--gr-bg-1)] p-4 ring-1 ring-[var(--gr-border)] transition-colors hover:ring-[var(--gr-violet-hi)]"
                      style={{ clipPath: cutMd }}
                    >
                      <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)] z-[1]" />
                      {/* stretched link — covers the whole card; interactive children opt-in with z-[2] */}
                      <Link
                        href={`/rooms/${room.room_code}`}
                        aria-label={`რუმი ${room.room_code}`}
                        className="absolute inset-0 z-0"
                      />

                      <div className="pointer-events-none flex flex-wrap items-start justify-between gap-3">
                        {/* left: host + title */}
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <Avatar className="h-10 w-10 shrink-0 border border-[var(--gr-border-hi)]">
                            <AvatarImage src={host?.avatar_url ?? undefined} alt={name} />
                            <AvatarFallback className="bg-[var(--gr-violet)]/15 text-xs text-[var(--gr-violet-hi)]">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-display text-[15px] font-bold text-white">
                                {name}
                              </h3>
                              {room.is_private && (
                                <Pill tone="neutral" icon={<Lock className="h-3 w-3" />}>
                                  პრივატული
                                </Pill>
                              )}
                              {full && <Pill tone="accent">სავსეა</Pill>}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--gr-text-dim)]">
                              {created && <span>{created}</span>}
                            </div>
                            {room.notes && (
                              <p className="mt-2 line-clamp-2 text-[12.5px] text-[var(--gr-text-mute)]">
                                {room.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* right: room ID + copy + (host only) close */}
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {room.mode !== "tdm" && (
                            <div className="text-right">
                              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
                                რუმის ID
                              </div>
                              <div className="font-mono text-[15px] font-bold tracking-wider text-[var(--gr-amber)]">
                                {room.room_code}
                              </div>
                            </div>
                          )}
                          <div className="pointer-events-auto relative z-[2] flex flex-col items-end gap-2">
                            {room.mode !== "tdm" && <CopyRoomCodeButton code={room.room_code} />}
                            {user?.id === room.host_id && (
                              <CloseRoomButton roomId={room.id} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* footer meta */}
                      <div className="pointer-events-none mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--gr-border)] pt-3">
                        {room.map && (
                          <Pill tone="neutral" icon={<MapPin className="h-3 w-3" />}>{room.map}</Pill>
                        )}
                        <Pill tone="neutral">{room.perspective}</Pill>
                        <Pill tone="neutral" icon={<UsersIcon className="h-3 w-3" />}>
                          {room.current_players}/{room.max_players}
                        </Pill>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
