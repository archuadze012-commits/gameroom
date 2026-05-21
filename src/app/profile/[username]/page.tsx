import { Card, CardContent } from "@/components/ui/card";
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
import { ProfileXp } from "@/components/profile-xp";
import { ProfileLinkedAccounts } from "@/components/profile-linked-accounts";
import { ProfileSummaryRight } from "@/components/profile-summary-right";
import { ProfileGameRows } from "@/components/profile-game-rows";
import { ProfileTabs } from "@/components/profile-tabs";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await getSession().catch(() => null);
  const avatarUrl = (session?.user_metadata?.avatar_url as string | undefined) ?? null;
  const currentUserId = session?.id ?? null;

  const supabase = await createSupabaseServerClient();

  const { data: dbProfile } = await supabase
    .from("profiles")
    .select("id, display_name, favorite_game_slugs, banner_url, is_verified, xp, level, daily_streak_count, youtube_handle, tiktok_handle, tiktok_followers")
    .eq("username", username)
    .maybeSingle();

  const targetUserId = dbProfile?.id ?? null;

  // isOwner = the logged-in user's profile row owns this username (authoritative via DB id)
  const isOwner = !!(currentUserId && targetUserId && currentUserId === targetUserId);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden border-border/60">
        <BannerUpload
          isOwner={isOwner}
          userId={isOwner ? (currentUserId ?? undefined) : undefined}
          initialBannerUrl={dbProfile?.banner_url ?? null}
        />

        <CardContent className="space-y-5 px-6 pb-6 pt-0">
          {/* Header — 2-col grid: left summary | right stats */}
          <div className="-mt-16 flex flex-col items-center gap-5 md:grid md:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)] md:items-start md:gap-6">
            {/* Left — avatar + name + badge + social icons */}
            <div className="flex flex-col items-center gap-2 md:items-start">
              <AvatarUpload
                username={username}
                displayName={displayName}
                avatarUrl={isOwner ? avatarUrl : null}
                isOwner={isOwner}
              />
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                {isOwner ? (
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
            <div className="w-full">
              <ProfileSummaryRight
                username={username}
                isOwner={isOwner}
                hasSession={!!session}
                initialFollowing={initialFollowing}
                initialFollowerCount={followerCount}
                level={dbProfile?.level ?? 1}
                xp={dbProfile?.xp ?? 0}
                streak={dbProfile?.daily_streak_count ?? 0}
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

          {/* XP + badges (level/streak/progress + badge collection) */}
          {dbProfile && (
            <ProfileXp
              xp={dbProfile.xp ?? 0}
              streak={dbProfile.daily_streak_count ?? 0}
              unlockedBadgeCodes={badgeCodes}
            />
          )}

          {/* Linked accounts (Riot only — Steam now lives in social icons above) */}
          {linkedAccounts.filter((a) => a.provider !== "steam").length > 0 && (
            <ProfileLinkedAccounts
              accounts={linkedAccounts.filter((a) => a.provider !== "steam")}
            />
          )}

          {/* Tabbed content area */}
          <ProfileTabs
            games={<ProfileGameRows slugs={dbProfile?.favorite_game_slugs ?? []} />}
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
                <p className="rounded-2xl border border-dashed border-[#1e2a44] py-8 text-center text-sm text-[#9fb3d1]">
                  ჯერ არცერთი LFG პოსტი არ არის.
                </p>
              ) : (
                <div className="space-y-2">
                  {userPosts.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-[#1e2a44] bg-[#0f1626] p-3 text-sm"
                    >
                      <p className="font-medium">{p.title}</p>
                      <p className="mt-1 text-xs text-[#9fb3d1]">{p.gameSlug}</p>
                    </div>
                  ))}
                </div>
              )
            }
            friends={
              <p className="rounded-2xl border border-dashed border-[#1e2a44] py-8 text-center text-sm text-[#9fb3d1]">
                მეგობრების სია მალე იქნება ხელმისაწვდომი.
              </p>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
