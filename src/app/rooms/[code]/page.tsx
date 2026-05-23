import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, MapPin, Users as UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { mockGames } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CopyRoomCodeButton } from "../new/copy-room-code-button";
import { CloseRoomButton } from "../new/close-room-button";
import { RoomChat } from "./room-chat";
import { RoomElapsed } from "./room-elapsed";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `რუმი ${code.toUpperCase()}` };
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const codeUpper = code.toUpperCase();

  const user = await getSession().catch(() => null);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("game_rooms")
    .select(
      "id, room_code, game_slug, mode, title, map, perspective, max_players, current_players, is_private, notes, status, created_at, expires_at, host_id, profiles!game_rooms_host_id_fkey(username, display_name, avatar_url)"
    )
    .eq("room_code", codeUpper)
    .maybeSingle();

  const room = data as unknown as RoomRow | null;
  if (!room) notFound();

  const game = mockGames.find((g) => g.slug === room.game_slug);
  const host = room.profiles;
  const hostName = host?.display_name ?? host?.username ?? "მომხმარებელი";
  const initial = hostName.slice(0, 1).toUpperCase();
  const isHost = user?.id === room.host_id;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-5xl px-4 py-8 lg:py-10">
        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <Link
            href={`/rooms/new?game=${room.game_slug}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {game?.nameKa ?? room.game_slug} / რუმები
          </Link>
        </nav>

        {/* room header card */}
        <article
          className="relative mb-6 bg-[var(--gr-bg-1)] p-5 ring-1 ring-[var(--gr-border)]"
          style={{ clipPath: cutMd }}
        >
          <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Link href={host?.username ? `/profile/${host.username}` : "#"} className="shrink-0">
                <Avatar className="h-12 w-12 border border-[var(--gr-border-hi)]">
                  <AvatarImage src={host?.avatar_url ?? undefined} alt={hostName} />
                  <AvatarFallback className="bg-[var(--gr-violet)]/15 text-[var(--gr-violet-hi)]">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-[20px] font-bold text-white">
                    {hostName}
                  </h1>
                  {room.is_private && (
                    <Pill tone="neutral" icon={<Lock className="h-3 w-3" />}>
                      პრივატული
                    </Pill>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-[var(--gr-text-dim)]">host</div>
                {room.notes && (
                  <p className="mt-2 text-[13px] text-[var(--gr-text-mute)]">{room.notes}</p>
                )}
              </div>
            </div>

            {/* room ID block */}
            <div className="flex shrink-0 flex-col items-end gap-2">
              {room.mode !== "tdm" && (
                <>
                  <div className="text-right">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)]">
                      რუმის ID
                    </div>
                    <div className="font-mono text-[20px] font-bold tracking-wider text-[var(--gr-amber)]">
                      {room.room_code}
                    </div>
                  </div>
                  <CopyRoomCodeButton code={room.room_code} />
                </>
              )}
              {isHost && <CloseRoomButton roomId={room.id} />}
            </div>
          </div>

          {/* meta + elapsed */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--gr-border)] pt-4">
            {room.map && (
              <Pill tone="neutral" icon={<MapPin className="h-3 w-3" />}>{room.map}</Pill>
            )}
            <Pill tone="neutral">{room.perspective}</Pill>
            <Pill tone="neutral" icon={<UsersIcon className="h-3 w-3" />}>
              {room.current_players}/{room.max_players}
            </Pill>
            <div className="ml-auto">
              <RoomElapsed createdAt={room.created_at} expiresAt={room.expires_at} />
            </div>
          </div>
        </article>

        {/* Chat */}
        <section>
          <h2 className="mb-3 font-display text-[14px] font-bold uppercase tracking-[0.18em] text-white">
            რუმის ჩატი
          </h2>
          <RoomChat roomId={room.id} currentUserId={user?.id ?? null} />
        </section>
      </div>
    </div>
  );
}
