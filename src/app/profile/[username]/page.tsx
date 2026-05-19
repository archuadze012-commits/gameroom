import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockLfgPosts, mockFeedPosts, mockUsers } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { RoleBadge, type UserRole } from "@/components/role-badge";
import { ProfileDisplayName } from "@/components/profile-display-name";
import { ProfileSocialLinks } from "@/components/profile-social-links";
import { BannerUpload } from "@/components/banner-upload";
import { ProfileFavoriteGames } from "@/components/profile-favorite-games";
import { ProfileFeed } from "@/components/profile-feed";
import { AvatarUpload } from "@/components/avatar-upload";
import { InviteButton } from "@/components/invite-button";
import { ProfileFollowClient } from "@/components/profile-follow-client";
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
  const sessionUsername =
    (session?.user_metadata?.username as string | undefined) ??
    session?.email?.split("@")[0] ??
    null;
  const isOwner = sessionUsername === username;
  const avatarUrl = (session?.user_metadata?.avatar_url as string | undefined) ?? null;
  const currentUserId = session?.id ?? null;

  const supabase = await createSupabaseServerClient();

  // fetch target profile from DB
  const { data: dbProfile } = await supabase
    .from("profiles")
    .select("id, display_name, favorite_game_slugs")
    .eq("username", username)
    .maybeSingle();

  const targetUserId = dbProfile?.id ?? null;

  // follower count
  let followerCount = 0;
  if (targetUserId) {
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetUserId);
    followerCount = count ?? 0;
  }

  // is current user following this profile?
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

  const gameCount = (dbProfile?.favorite_game_slugs ?? []).length;
  const mockUser = mockUsers.find((u) => u.username === username);
  const displayName = dbProfile?.display_name ?? mockUser?.displayName ?? username;
  const userPosts = mockLfgPosts.filter((p) => p.authorName === username).slice(0, 5);
  const feedPosts = mockFeedPosts.filter((p) => p.authorName === username);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden border-border/60">

        {/* Banner */}
        <BannerUpload isOwner={isOwner} />

        <CardContent className="space-y-4 px-6 pb-6 pt-0">

          {/* Avatar + name + trust + follow (center) with favorites (left) and buttons (right) */}
          <div className="flex flex-col items-center gap-3 -mt-12 md:grid md:grid-cols-3 md:items-start md:gap-4">

            {/* Left — favorite games */}
            <div className="order-2 w-full md:order-1 md:pt-14">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ფავორიტი ვიდეოთამაშები
              </p>
              <ProfileFavoriteGames
                fallbackSlugs={dbProfile?.favorite_game_slugs ?? []}
                isOwner={isOwner}
                userId={currentUserId ?? undefined}
              />
            </div>

            {/* Center — avatar + name + follow button */}
            <div className="order-1 flex flex-col items-center gap-2 md:order-2">
              <AvatarUpload
                username={username}
                displayName={displayName}
                avatarUrl={isOwner ? avatarUrl : null}
                isOwner={isOwner}
              />
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                {isOwner
                  ? <ProfileDisplayName fallback={displayName} userId={currentUserId ?? undefined} />
                  : displayName}
              </h1>
              <RoleBadge username={username} defaultRole={mockUser?.role as UserRole | undefined} />

              {/* FollowButton only for non-owners (rendered inside ProfileFollowClient) */}
              {!isOwner && session && (
                <ProfileFollowClient
                  username={username}
                  isOwner={false}
                  initialFollowing={initialFollowing}
                  initialFollowerCount={followerCount}
                  lfgCount={userPosts.length}
                  gameCount={gameCount}
                  statsOnly={false}
                />
              )}
            </div>

            {/* Right — action buttons */}
            <div className="order-3 flex flex-wrap justify-center gap-2 md:justify-end md:pt-14">
              {!isOwner && (
                <InviteButton
                  username={username}
                  displayName={displayName}
                  gameSlugs={mockUser?.games.map((g) => g.slug) ?? []}
                />
              )}
              <Button size="sm" variant="outline">შეტყობინება</Button>
            </div>
          </div>

          {/* Social channels */}
          <ProfileSocialLinks
            defaultYtHandle=""
            defaultTtHandle=""
            ytSubscribers="—"
            ttFollowers="—"
            isOwner={isOwner}
            userId={currentUserId ?? undefined}
          />

          <Separator />

          {/* Stats — for owner or unauthenticated visitor, use simple stat row */}
          {(isOwner || !session) && (
            <ProfileFollowClient
              username={username}
              isOwner={true}
              initialFollowing={false}
              initialFollowerCount={followerCount}
              lfgCount={userPosts.length}
              gameCount={gameCount}
              statsOnly={true}
            />
          )}
        </CardContent>
      </Card>

      <ProfileFeed
        username={username}
        displayName={displayName}
        initialPosts={feedPosts}
        isOwner={isOwner}
      />
    </div>
  );
}
