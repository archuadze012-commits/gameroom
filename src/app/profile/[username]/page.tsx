import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { mockLfgPosts, mockFeedPosts, mockUsers } from "@/lib/mock-data";
import { RoleBadge, type UserRole } from "@/components/role-badge";
import { ProfileDisplayName } from "@/components/profile-display-name";
import { ProfileSocialLinks } from "@/components/profile-social-links";
import { BannerUpload } from "@/components/banner-upload";
import { ProfileFeed } from "@/components/profile-feed";
import { AvatarUpload } from "@/components/avatar-upload";
import { InviteButton } from "@/components/invite-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ReportButton } from "@/components/report-button";
import { MessageButton } from "@/components/message-button";
import { ProfileLinkedAccounts } from "@/components/profile-linked-accounts";
import { ProfileSummaryRight } from "@/components/profile-summary-right";
import { ProfileGameRows } from "@/components/profile-game-rows";
import { ProfileTabs } from "@/components/profile-tabs";
import { Button } from "@/components/ui/button";
import { Paintbrush } from "lucide-react";
import { getSession, getIsAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminGrantCoins } from "@/components/admin-grant-coins";
import { getEquippedItems } from "@/lib/shop/equip-queries";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [session, isAdmin] = await Promise.all([
    getSession().catch(() => null),
    getIsAdmin().catch(() => false),
  ]);
  const sessionAvatarUrl = (session?.user_metadata?.avatar_url as string | undefined) ?? null;
  const currentUserId = session?.id ?? null;

  const supabase = await createSupabaseServerClient();

  const { data: dbProfile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, favorite_game_slugs, banner_url, is_verified, youtube_handle, tiktok_handle, tiktok_followers")
    .eq("username", username)
    .maybeSingle();

  const targetUserId = dbProfile?.id ?? null;

  // isOwner = the logged-in user's profile row owns this username (authoritative via DB id)
  const isOwner = !!(currentUserId && targetUserId && currentUserId === targetUserId);
  const profileAvatarUrl = dbProfile?.avatar_url ?? null;
  const avatarUrl = profileAvatarUrl ?? (isOwner ? sessionAvatarUrl : null);

  let followerCount = 0;
  if (targetUserId) {
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetUserId);
    followerCount = count ?? 0;
  }

  let initialFollowing = false;
  if (currentUserId && targetUserId && !isOwner) {
    const { data } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle();
    initialFollowing = !!data;
  }

  const mockUser = mockUsers.find((u) => u.username === username);
  const displayName = dbProfile?.display_name ?? mockUser?.displayName ?? username;
  
  const userPosts = mockLfgPosts.filter((p) => p.authorName === username).slice(0, 5);

  const feedPosts = mockFeedPosts.filter((p) => p.authorName === username);

  let badgeCodes: string[] = [];
  let linkedAccounts: Array<{
    provider: "steam" | "riot";
    external_id: string;
    data: Record<string, unknown> | null;
    verified: boolean;
  }> = [];
  if (targetUserId) {
    const [{ data: badges }, { data: linked }] = await Promise.all([
      supabase.from("badge_unlocks").select("badge_code").eq("user_id", targetUserId),
      supabase
        .from("linked_accounts")
        .select("provider, external_id, data, verified")
        .eq("user_id", targetUserId),
    ]);
    badgeCodes = (badges ?? []).map((b: { badge_code: string }) => b.badge_code);
    linkedAccounts = (linked ?? []) as typeof linkedAccounts;
  }

  const steamAccount = linkedAccounts.find((a) => a.provider === "steam");

  const equippedItems = targetUserId ? await getEquippedItems(targetUserId) : [];
  const equippedCover = equippedItems.find((e) => e.category === "cover");
  const equippedFrame = equippedItems.find((e) => e.category === "profile_frame");
  const equippedNameFrame = equippedItems.find((e) => e.category === "name_frame");
  const equippedTheme = equippedItems.find((e) => e.category === "profile_theme");

  const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
  const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

  return (
    <div className={`relative min-h-[calc(100vh-4rem)] ${equippedTheme ? `bg-gradient-to-br ${equippedTheme.metadata.bg as string}` : "bg-[var(--gr-bg-1)]"}`}>
            <div className="relative">
              {equippedCover ? (
                <div className={`h-40 w-full bg-gradient-to-r ${equippedCover.metadata.gradient as string} sm:h-48`} />
              ) : (
                <BannerUpload
                  isOwner={false}
                  initialBannerUrl={dbProfile?.banner_url ?? null}
                />
              )}
              {isOwner && (
                <Link
                  href="/shop?mine=true"
                  className="absolute bottom-3 right-3 z-10 inline-flex h-7 items-center gap-1.5 bg-[color-mix(in_srgb,var(--gr-bg-0)_80%,transparent)] px-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-border)] backdrop-blur-md transition hover:ring-[var(--gr-violet-hi)] hover:bg-[color-mix(in_srgb,var(--gr-violet)_14%,transparent)] [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)]"
                >
                  <Paintbrush className="h-3 w-3" />
                  კუსტომიზაცია
                </Link>
              )}
            </div>

            <div className="space-y-5 px-6 pb-6 pt-0">
          {/* Header — 2-col grid: left summary | right stats */}
          <div className="-mt-16 flex flex-col items-center gap-5 md:grid md:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)] md:items-start md:gap-6">
            {/* Left — avatar + name + badge + social icons */}
            <div className="flex flex-col items-center gap-2 md:items-start">
              <div
                className="rounded-full"
                style={equippedFrame ? {
                  boxShadow: `0 0 20px ${equippedFrame.metadata.color as string}50, 0 0 40px ${equippedFrame.metadata.color as string}25`,
                  border: `3px solid ${equippedFrame.metadata.color as string}`,
                } : undefined}
              >
                <AvatarUpload
                  username={username}
                  displayName={displayName}
                  avatarUrl={avatarUrl}
                  isOwner={isOwner}
                />
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                {equippedNameFrame ? (
                  <span className={`bg-gradient-to-r ${equippedNameFrame.metadata.gradient as string} bg-clip-text text-transparent`}>
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
                {dbProfile?.is_verified && <VerifiedBadge className="h-5 w-5" />}
              </h1>
              <RoleBadge username={username} defaultRole={mockUser?.role as UserRole | undefined} />

              <div className="mt-1">
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

            {/* Right — stats list + follow + action buttons */}
            <div className="w-full md:mt-16">
              <ProfileSummaryRight
                username={username}
                isOwner={isOwner}
                hasSession={!!session}
                initialFollowing={initialFollowing}
                initialFollowerCount={followerCount}
              />

              {!isOwner && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <InviteButton
                    username={username}
                    displayName={displayName}
                    gameSlugs={mockUser?.games.map((g) => g.slug) ?? []}
                  />
                  {targetUserId && session && <MessageButton targetUserId={targetUserId} />}
                  {targetUserId && (
                    <Button size="sm" variant="outline" asChild>
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

          <Separator />

          {/* Admin: grant coins — only visible to admins, hidden on own profile */}
          {isAdmin && targetUserId && (
            <AdminGrantCoins targetUserId={targetUserId} targetUsername={username} />
          )}

          {/* Linked accounts (Riot only — Steam now lives in social icons above) */}
          {linkedAccounts.filter((a) => a.provider !== "steam").length > 0 && (
            <ProfileLinkedAccounts
              accounts={linkedAccounts.filter((a) => a.provider !== "steam")}
            />
          )}

          {/* Tabbed content area */}
          <ProfileTabs
            games={<ProfileGameRows slugs={dbProfile?.favorite_game_slugs ?? []} username={username} />}
            posts={
              <ProfileFeed
                username={username}
                displayName={displayName}
                initialPosts={feedPosts}
                isOwner={isOwner}
              />
            }
            lfg={
              userPosts.length === 0 ? (
                <p className="border border-dashed border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)]/40 py-8 text-center text-[13px] text-[var(--gr-text-mute)]">
                  ჯერ არცერთი ლოკალის პოსტი არ არის.
                </p>
              ) : (
                <div className="space-y-2">
                  {userPosts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-[var(--gr-bg-2)] p-3 text-[13px] ring-1 ring-[var(--gr-border)]"
                      style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)" }}
                    >
                      <p className="font-display text-[14px] font-bold uppercase tracking-tight text-[var(--gr-text)]">{p.title}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">{p.gameSlug}</p>
                    </div>
                  ))}
                </div>
              )
            }
            friends={
              <p className="border border-dashed border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)]/40 py-8 text-center text-[13px] text-[var(--gr-text-mute)]">
                მეგობრების სია მალე იქნება ხელმისაწვდომი.
              </p>
            }
          />
            </div>
    </div>
  );
}
