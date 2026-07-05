import Link from "next/link";
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
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Cinematic Ambient Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />

      <div className="container relative mx-auto max-w-5xl px-4 py-8 lg:py-10">
        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            href={`/games/${gameSlug}/lobby`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50 transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-400"
          >
            ← {game?.nameKa ?? gameSlug} / ლობი
          </Link>
        </nav>

        {/* header — mode selector */}
        <header className="mb-8">
          <div className="flex flex-col gap-2 rounded-[20px] border border-white/5 bg-black/40 p-2 backdrop-blur-md sm:inline-flex sm:flex-row sm:flex-wrap sm:items-center">
            {ROOM_MODES.map((m) => {
              const active = m.key === mode;
              return (
                <Link
                  key={m.key}
                  href={`/rooms/new?game=${gameSlug}&mode=${m.key}`}
                  className={`relative rounded-[14px] px-5 py-2.5 text-center text-[12px] font-black uppercase tracking-[0.16em] transition-all sm:text-[13px] ${
                    active
                      ? "bg-[linear-gradient(135deg,#00d0ff,#6366f1)] text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                      : "text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
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
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-white/5 bg-black/40 p-5 backdrop-blur-md">
              <p className="text-[13px] font-medium text-white/60">
                რუმის შესაქმნელად შედი ანგარიშში.
              </p>
              <Link
                href={`/auth/login?next=/rooms/new?game=${gameSlug}`}
                className="inline-flex items-center gap-2 rounded-full border border-pink-500/50 bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all hover:scale-105"
              >
                შესვლა
              </Link>
            </div>
          )}

          {/* Rooms list */}
          <section>
            <h2 className="mb-6 font-display text-[14px] font-black uppercase tracking-[0.18em] text-white drop-shadow-md">
              LIVE რუმები <span className="ml-2 text-cyan-400">({rooms.length})</span>
            </h2>

            {rooms.length === 0 ? (
              <EmptyState
                tone="violet"
                illustration={<DoorOpen className="h-10 w-10 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />}
                title="ცარიელია"
                description="ჯერ არცერთი რუმი არ შექმნილა. გახდი პირველი — შექმენი რუმი ზემოთ."
              />
            ) : (
              <div className="grid gap-4">
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
                      className="group neon-frame rounded-[24px]"
                    >
                      <div className="relative h-full w-full rounded-[21px] bg-[#0a0714] p-5 sm:p-6 backdrop-blur-md">
                        <Link
                          href={`/rooms/${room.room_code}`}
                          aria-label={`რუმი ${room.room_code}`}
                          className="absolute inset-0 z-0"
                        />

                        <div className="pointer-events-none relative z-[1] flex flex-wrap items-start justify-between gap-4">
                          {/* left: host + title */}
                          <div className="flex min-w-0 flex-1 items-start gap-4">
                            <Avatar className="h-12 w-12 shrink-0 border border-white/10 shadow-lg">
                              <AvatarImage src={host?.avatar_url ?? undefined} alt={name} />
                              <AvatarFallback className="bg-violet-500/10 text-xs font-bold text-violet-400">
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate font-display text-[16px] font-bold text-white drop-shadow-sm">
                                  {name}
                                </h3>
                                {room.is_private && (
                                  <Pill tone="neutral" icon={<Lock className="h-3 w-3" />}>
                                    პრივატული
                                  </Pill>
                                )}
                                {full && <Pill tone="accent">სავსეა</Pill>}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-medium text-white/40">
                                {created && <span>{created}</span>}
                              </div>
                              {room.notes && (
                                <p className="mt-3 line-clamp-2 text-[13px] font-medium leading-relaxed text-white/60">
                                  {room.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* right: room ID + copy + (host only) close */}
                          <div className="flex shrink-0 flex-col items-end gap-3">
                            {room.mode !== "tdm" && (
                              <div className="text-right">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/70">
                                  რუმის ID
                                </div>
                                <div className="mt-1 font-mono text-[16px] font-bold tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
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
                        <div className="pointer-events-none relative z-[1] mt-5 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
                          {room.map && (
                            <Pill tone="neutral" icon={<MapPin className="h-3.5 w-3.5" />}>{room.map}</Pill>
                          )}
                          <Pill tone="neutral">{room.perspective}</Pill>
                          <Pill tone="neutral" icon={<UsersIcon className="h-3.5 w-3.5" />}>
                            {room.current_players}/{room.max_players}
                          </Pill>
                        </div>
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
