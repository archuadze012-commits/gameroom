import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/admin";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockChatChannels, mockChatMessages, mockGames } from "@/lib/mock-data";
import { PubgMobileChatClient } from "./pubg-mobile-chat-client";

export const metadata = { title: "PUBG Mobile Chat" };
export const dynamic = "force-dynamic";

export default async function PubgMobileChatPage() {
  const game = mockGames.find((entry) => entry.slug === "pubg-mobile");
  const channel = mockChatChannels.find((entry) => entry.gameSlug === "pubg-mobile" && entry.type === "game");

  if (!game || !channel) notFound();

  const user = await getSession().catch(() => null);
  const canManageChat = user ? await hasPermission("manage_chat").catch(() => false) : false;
  let currentUser: { username: string; displayName: string | null; avatarUrl: string | null } | null = null;
  let activeMuteUntil: string | null = null;

  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.username) {
      currentUser = {
        username: profile.username,
        displayName: profile.display_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
      };
    }

    const { data: mutes } = await supabase
      .from("user_mutes")
      .select("expires_at")
      .eq("user_id", user.id)
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const activeMute = (mutes ?? []).find((mute) => {
      if (!mute.expires_at) return true;
      const expiresAtMs = new Date(mute.expires_at).getTime();
      // Request-time mute expiry gate for this dynamic page.
      // eslint-disable-next-line react-hooks/purity
      return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
    });

    if (activeMute) {
      if (!activeMute.expires_at) {
        activeMuteUntil = "permanent";
      } else {
        activeMuteUntil = activeMute.expires_at;
      }
    }
  }

  const messages = mockChatMessages[channel.id] ?? [];

  return (
    <div className="relative h-[calc(100dvh-8rem)] overflow-hidden bg-[#05050f] xl:h-[calc(100dvh-4rem)]">
      {/* Cinematic Ambient Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />

      <div className="container relative mx-auto flex h-full items-stretch px-4 pb-6 pt-4 md:pb-7 md:pt-6 xl:pb-10 xl:pt-8">
        <PubgMobileChatClient
          initialMessages={messages}
          currentUser={currentUser}
          title={channel.name}
          avatarUrl={game.iconUrl ?? game.coverUrl ?? null}
          channelId={channel.id}
          canManageChat={canManageChat}
          activeMuteUntil={activeMuteUntil}
        />
      </div>
    </div>
  );
}
