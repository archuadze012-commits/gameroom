import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { mockLfgPosts, mockUsers } from "@/lib/mock-data";
import { RoleBadge, type UserRole } from "@/components/role-badge";
import { ProfileDisplayName } from "@/components/profile-display-name";
import { ProfileSocialLinks } from "@/components/profile-social-links";
import { BannerUpload } from "@/components/banner-upload";
import { ProfileFeed, type ProfileFeedPost } from "@/components/profile-feed";
import { AvatarUpload } from "@/components/avatar-upload";
import { InviteButton } from "@/components/invite-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ReportButton } from "@/components/report-button";
import { MessageButton } from "@/components/message-button";
import { ProfileSummaryRight } from "@/components/profile-summary-right";
import { ProfileGameRows } from "@/components/profile-game-rows";
import { ProfileTabs } from "@/components/profile-tabs";
import { Button } from "@/components/ui/button";
import { Paintbrush, Sparkles, ArrowRight } from "lucide-react";
import { getSession, getIsAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminGrantCoins } from "@/components/admin-grant-coins";
import { getEquippedItems } from "@/lib/shop/equip-queries";
import { ProfileFriendsTab } from "@/components/profile-friends-tab";
import { TrophyCabinet } from "@/components/profile/trophy-cabinet";

// Public-safe display fields per linked-account provider. Everything else in
// linked_accounts.metadata (and — for token-bearing providers like TikTok —
// access/refresh tokens) is dropped before it reaches a profile viewer's
// client payload. Unknown providers expose nothing.
const LINKED_DISPLAY_FIELDS: Record<string, string[]> = {
  steam: ["personaName", "profileUrl", "gameCount", "avatarUrl"],
};
function pickLinkedDisplayFields(provider: string, metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") return null;
  const allow = LINKED_DISPLAY_FIELDS[provider];
  if (!allow) return null;
  const src = metadata as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of allow) if (key in src) out[key] = src[key];
  return Object.keys(out).length > 0 ? out : null;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();
  const mock = mockUsers.find((u) => u.username === username);
  if (!p && !mock) return { title: "პროფილი ვერ მოიძებნა", robots: { index: false } };
  const name = p?.display_name ?? mock?.displayName ?? username;
  const title = `${name} (@${username})`;
  const description =
    (p?.bio ?? "").replace(/\s+/g, " ").trim().slice(0, 160) || `${name} — გეიმერის პროფილი PLAYGAME.GE-ზე.`;
  const image = p?.avatar_url ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/profile/${username}` },
    openGraph: {
      title,
      description,
      url: `/profile/${username}`,
      type: "profile",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();

  // The profile-by-username row depends only on the URL param, not on the
  // viewer's session — fetch it concurrently with session/isAdmin instead of
  // after them (~1 saved round trip per profile view).
  const [session, isAdmin, { data: dbProfile }] = await Promise.all([
    getSession().catch(() => null),
    getIsAdmin().catch(() => false),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, favorite_game_slugs, main_game_slug, banner_url, is_verified, youtube_handle, tiktok_handle, tiktok_followers, xp, daily_streak_count")
      .eq("username", username)
      .maybeSingle(),
  ]);
  const sessionAvatarUrl = (session?.user_metadata?.avatar_url as string | undefined) ?? null;
  const currentUserId = session?.id ?? null;

  if (!dbProfile && currentUserId) {
    const legacySlugs = new Set(
      [
        session?.user_metadata?.username,
        session?.user_metadata?.name,
        session?.user_metadata?.full_name,
        session?.user_metadata?.display_name,
        session?.email?.split("@")[0],
      ]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .map((value) => value.toLowerCase())
    );

    if (legacySlugs.has(username.toLowerCase())) {
      const { data: ownProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", currentUserId)
        .maybeSingle();

      if (ownProfile?.username && ownProfile.username !== username) {
        redirect(`/profile/${ownProfile.username}`);
      }
    }
  }

  const targetUserId = dbProfile?.id ?? null;

  const isOwner = !!(currentUserId && targetUserId && currentUserId === targetUserId);
  const profileAvatarUrl = dbProfile?.avatar_url ?? null;
  const avatarUrl = profileAvatarUrl ?? (isOwner ? sessionAvatarUrl : null);

  const mockUser = mockUsers.find((u) => u.username === username);
  // No real profile and no mock fallback (and the legacy-slug redirect above
  // didn't fire) → a genuine 404, not an empty profile shell served as HTTP 200.
  if (!dbProfile && !mockUser) notFound();
  const displayName = dbProfile?.display_name ?? mockUser?.displayName ?? username;
  const userPosts = mockLfgPosts.filter((p) => p.authorName === username).slice(0, 5);

  // Game slugs already known from the profile row; the lfg fallback query below
  // only runs when the profile configured none.
  const baseGameSlugs = Array.from(
    new Set([
      ...((dbProfile?.favorite_game_slugs as string[] | null) ?? []),
      ...(dbProfile?.main_game_slug ? [dbProfile.main_game_slug] : []),
    ])
  );
  const needLfgFallback = !!targetUserId && baseGameSlugs.length === 0;

  // Every read below depends only on targetUserId (+ the current viewer) and was
  // previously awaited one-by-one, serializing ~5 round-trips on every profile
  // view. Fire them concurrently instead; the posts follow-up (comment/like
  // counts) still runs after, since it needs the post ids.
  const [followerRes, followingRes, postsRes, linkedRes, lfgFallbackRes, equippedItems, badgeRes] = await Promise.all([
    targetUserId
      ? supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetUserId)
      : Promise.resolve({ count: 0 }),
    currentUserId && targetUserId && !isOwner
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    targetUserId
      ? supabase
          .from("posts")
          .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_profiles_id_fk(username, display_name, avatar_url, is_verified, role)")
          .eq("author_id", targetUserId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
    targetUserId
      ? supabase.from("linked_accounts").select("provider, external_id, metadata").eq("user_id", targetUserId)
      : Promise.resolve({ data: null }),
    needLfgFallback
      ? supabase.from("lfg_posts").select("game_slug").eq("author_id", targetUserId).limit(12)
      : Promise.resolve({ data: null }),
    targetUserId ? getEquippedItems(targetUserId) : Promise.resolve([]),
    targetUserId
      ? supabase.from("badge_unlocks").select("badge_code").eq("user_id", targetUserId)
      : Promise.resolve({ data: null }),
  ]);

  const unlockedBadgeCodes = ((badgeRes.data ?? []) as Array<{ badge_code: string }>).map(
    (b) => b.badge_code
  );

  const followerCount = followerRes.count ?? 0;
  const initialFollowing = !!followingRes.data;

  let feedPosts: ProfileFeedPost[] = [];
  let likedPostIds: string[] = [];
  const rawPosts = (postsRes.data ?? []) as unknown as Array<Omit<ProfileFeedPost, "comments_count">>;
  if (rawPosts.length > 0) {
    const postIds = rawPosts.map((post) => post.id);
    const [{ data: commentRows }, likedRowsResult] = await Promise.all([
      supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds)
        .is("deleted_at", null),
      currentUserId
        ? supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", currentUserId)
            .in("post_id", postIds)
        : Promise.resolve({ data: [] as Array<{ post_id: string }> | null }),
    ]);

    const commentCounts = new Map<string, number>();
    for (const row of commentRows ?? []) {
      commentCounts.set(row.post_id, (commentCounts.get(row.post_id) ?? 0) + 1);
    }

    likedPostIds = (likedRowsResult.data ?? []).map((row: { post_id: string }) => row.post_id);
    feedPosts = rawPosts.map((post) => ({
      ...post,
      comments_count: commentCounts.get(post.id) ?? 0,
    }));
  }

  const linkedAccounts: Array<{
    provider: string;
    external_id: string;
    data: Record<string, unknown> | null;
    verified: boolean;
  }> = (linkedRes.data ?? []).map((row) => ({
    provider: row.provider,
    external_id: row.external_id,
    // Whitelist only display fields per provider — never ship the raw metadata
    // blob to a public profile viewer. Steam stores no tokens, but other
    // providers (e.g. TikTok) keep access/refresh tokens in metadata, so
    // default to null and only surface known-safe presentational keys.
    data: pickLinkedDisplayFields(row.provider, row.metadata),
    verified: true,
  }));

  const profileGameSlugs = needLfgFallback
    ? Array.from(
        new Set(
          ((lfgFallbackRes.data ?? []) as Array<{ game_slug: string | null }>)
            .map((row) => row.game_slug)
            .filter(Boolean) as string[]
        )
      )
    : baseGameSlugs;

  const steamAccount = linkedAccounts.find((a) => a.provider === "steam");
  const equippedCover = equippedItems.find((e) => e.category === "cover");
  const equippedFrame = equippedItems.find((e) => e.category === "profile_frame");
  const equippedNameFrame = equippedItems.find((e) => e.category === "name_frame");
  const equippedTheme = equippedItems.find((e) => e.category === "profile_theme");
  const profileFeedProps = {
    currentUser: currentUserId
      ? {
          id: currentUserId,
          username,
          displayName,
          avatarUrl,
        }
      : undefined,
    initialPosts: feedPosts,
    initialLikedIds: likedPostIds,
    isOwner,
    canDeletePosts: isOwner || isAdmin,
  } as const;

  return (
    <div className={`relative min-h-[calc(100vh-4rem)] ${equippedTheme ? `bg-gradient-to-br ${equippedTheme.metadata.bg as string}` : "bg-transparent"}`}>
      {/* Ambient background glow if no theme */}
      {!equippedTheme && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.1),transparent_70%)]" />
      )}

      <div className="relative mb-0">
        {dbProfile?.banner_url || !equippedCover ? (
          <BannerUpload
            isOwner={isOwner}
            userId={targetUserId ?? undefined}
            initialBannerUrl={dbProfile?.banner_url ?? null}
          />
        ) : (
          <div className={`h-48 w-full bg-gradient-to-r ${equippedCover.metadata.gradient as string} shadow-[inset_0_-20px_40px_rgba(0,0,0,0.5)]`} />
        )}
        
        {isOwner && (
          <Link
            href="/shop?mine=true"
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.3)] backdrop-blur-md transition-all hover:bg-pink-500/20 hover:shadow-[0_0_25px_rgba(236,72,153,0.5)]"
          >
            <Paintbrush className="h-3.5 w-3.5" />
            კუსტომიზაცია
          </Link>
        )}
      </div>

      <div className="relative z-20 mx-auto max-w-7xl space-y-6 px-4 pb-12 pt-0 sm:px-6 lg:px-8">
        
        {/* Header — 2-col grid: left summary | right stats */}
        <div className="pubg-loadout-card group relative w-full overflow-hidden px-6 pb-6 pt-16 sm:px-8 sm:pb-8 sm:pt-20 shadow-2xl">
            <span aria-hidden className="pubg-loadout-field absolute inset-0" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
            <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-32 w-32 opacity-50" />
            <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/2" />
            
            <div className="relative z-[1] flex w-full flex-col items-center gap-6 md:flex-row md:items-end md:justify-between md:gap-8">
            
            {/* Left — avatar + name + badge + social icons */}
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:gap-6">
            <div
              className="relative shrink-0 rounded-full bg-[#05050f] p-1.5 flex items-center justify-center"
              style={equippedFrame ? {
                boxShadow: `0 0 30px ${equippedFrame.metadata.color as string}50, 0 0 60px ${equippedFrame.metadata.color as string}25`,
                background: `linear-gradient(135deg, ${equippedFrame.metadata.color as string}, transparent)`,
              } : {
                boxShadow: "0 0 30px rgba(139,92,246,0.2)",
                background: "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(236,72,153,0.5))",
              }}
            >
              <div className="flex rounded-full border-[4px] border-[#05050f]">
                <AvatarUpload
                  username={username}
                  displayName={displayName}
                  avatarUrl={avatarUrl}
                  isOwner={isOwner}
                />
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-start md:pb-2">
              <h1 className="flex items-center gap-2 font-display text-3xl font-black uppercase tracking-tight text-white drop-shadow-md">
                {equippedNameFrame ? (
                  <span className={`bg-gradient-to-r ${equippedNameFrame.metadata.gradient as string} bg-clip-text text-transparent drop-shadow-lg`}>
                    {isOwner ? (
                      <ProfileDisplayName fallback={displayName} userId={currentUserId ?? undefined} />
                    ) : (
                      displayName
                    )}
                  </span>
                ) : isOwner ? (
                  <ProfileDisplayName fallback={displayName} userId={currentUserId ?? undefined} />
                ) : (
                  displayName
                )}
                {dbProfile?.is_verified && <VerifiedBadge className="h-6 w-6" />}
              </h1>
              
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <RoleBadge username={username} defaultRole={mockUser?.role as UserRole | undefined} />
                <ProfileSocialLinks
                  defaultYtHandle={dbProfile?.youtube_handle ?? ""}
                  defaultTtHandle={dbProfile?.tiktok_handle ?? ""}
                  isOwner={isOwner}
                  userId={currentUserId ?? undefined}
                  steam={
                    steamAccount
                      ? {
                          external_id: steamAccount.external_id,
                          data: steamAccount.data as {
                            personaName?: string;
                            profileUrl?: string;
                            gameCount?: number;
                          } | null,
                        }
                      : null
                  }
                />
              </div>
            </div>
          </div>

          {/* Right — stats list + follow + action buttons */}
          <div className="w-full md:w-auto md:pb-2">
            <ProfileSummaryRight
              username={username}
              isOwner={isOwner}
              hasSession={!!session}
              initialFollowing={initialFollowing}
              initialFollowerCount={followerCount}
            />

            {!isOwner && (
              <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-end">
                <InviteButton
                  username={username}
                  displayName={displayName}
                  gameSlugs={profileGameSlugs}
                />
                {targetUserId && session && <MessageButton targetUserId={targetUserId} />}
                {targetUserId && (
                  <Button size="sm" variant="ghost" className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:text-red-400" asChild>
                    <span className="flex items-center gap-1.5">
                      <ReportButton
                        targetType="profile"
                        targetId={targetUserId}
                        iconSize="h-3.5 w-3.5"
                      />
                      Report
                    </span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        </div>

        {targetUserId && (
          <div className="mt-8">
            <TrophyCabinet
              xp={dbProfile?.xp ?? 0}
              streak={dbProfile?.daily_streak_count ?? 0}
              isVerified={!!dbProfile?.is_verified}
              unlockedCodes={unlockedBadgeCodes}
            />

            {/* Seasonal Wrapped entry — prominent link to the shareable recap. */}
            <Link
              href={`/wrapped/${username}`}
              className="group mt-3 flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--gr-violet-hi)]/30 bg-[linear-gradient(135deg,rgba(139,92,246,0.14),rgba(236,72,153,0.1))] px-4 py-3.5 transition-all hover:border-[var(--gr-violet-hi)]/60 hover:brightness-110"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--gr-violet),var(--gr-magenta))] shadow-[0_0_16px_rgba(139,92,246,0.45)]">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[14px] font-black uppercase tracking-wide text-white">
                  {isOwner ? "შენი PlayGame Wrapped" : "PlayGame Wrapped"}
                </span>
                <span className="block text-[11.5px] text-white/50">
                  სეზონური რთანი — ნახე და გააზიარე
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--gr-violet-hi)] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        <Separator className="my-8 bg-white/5" />

        {/* Admin: grant coins */}
        {isAdmin && targetUserId && (
          <AdminGrantCoins targetUserId={targetUserId} targetUsername={username} />
        )}

        {/* Tabbed content area */}
        <ProfileTabs
          games={
            <div className="space-y-8">
              <ProfileGameRows slugs={profileGameSlugs} username={username} />
              <ProfileFeed {...profileFeedProps} />
            </div>
          }
          posts={
            <ProfileFeed {...profileFeedProps} />
          }
          lfg={
            userPosts.length === 0 ? (
              <div className="flex items-center justify-center rounded-[20px] border border-white/5 bg-white/5 py-12 text-[14px] font-medium text-white/40">
                ჯერ არცერთი ლოკალის პოსტი არ არის.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {userPosts.map((p) => (
                  <div key={p.id} className="pubg-loadout-link group relative block transition-all duration-500" data-variant="strike">
                    <div className="pubg-loadout-card relative flex flex-col h-full overflow-hidden p-5">
                      <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                      <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
                      <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-30" />
                      <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3" />
                      
                      <div className="relative z-[1] flex flex-col justify-between h-full gap-3">
                        <div className="border-b border-white/[0.07] pb-3 mb-1">
                          <p className="pubg-loadout-kicker text-[10px] font-black uppercase leading-none tracking-[0.24em] text-white/58">
                            {p.gameSlug}
                          </p>
                          <span aria-hidden className="pubg-loadout-marker mt-2 block h-px w-12" />
                        </div>
                        <p className="pubg-loadout-title font-display text-[16px] font-black uppercase leading-[1.1] text-white">{p.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
          friends={
            <div className="pubg-loadout-link group relative block transition-all duration-500" data-variant="room">
              <div className="pubg-loadout-card relative overflow-hidden p-6 sm:p-8">
                <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
                <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-32 w-32 opacity-20" />
                <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3" />
                
                <div className="relative z-[1]">
                  <ProfileFriendsTab
                    username={username}
                    currentUserId={currentUserId}
                  />
                </div>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
